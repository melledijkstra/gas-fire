import type {
  ServerResponse,
  RawTable,
  ImportPreviewResult,
  TransactionAction,
} from '@/common/types'
import {
  Pipeline,
  removeEmptyRowsStage,
  transformToFireTableStage,
  sortByDateStage,
  duplicateDetectionStage,
  autoFillPreviewStage,
  applyUserDecisionsStage,
} from './pipeline'
import type { ImportPipelineContext, PipelineContext, PreviewPipelineContext } from './pipeline'
import { Config } from '../config'
import { FireSheet } from '../spreadsheet/FireSheet'
import { parseRulesByAccount, type PackedRuleEngineResult } from '../rule-engine'
import { Table } from '@/common/table/Table'
import { getRowHash, structuredClone } from '@/common/helpers'
import { Logger } from '@/common/logger'
import { removeFilterCriteria } from '../spreadsheet/spreadsheet'
import { FEATURES } from '@/common/settings'
import { AccountUtils, isNumeric } from '../accounts/account-utils'
import { FireTable } from '../table/FireTable'
import { applyPreTransformRulesStage, postTransformRulesStage } from '../rule-engine/pipeline'
import { RuleSheet } from '../spreadsheet/RuleSheet'

/**
 * Activates the target sheet and removes any active filters.
 * Filters must be removed before importing to avoid data corruption.
 */
function prepareSheetForImport(fireSheet: FireSheet): void {
  fireSheet.activate()

  const filter = fireSheet.getFilter()
  if (filter && !removeFilterCriteria(filter, true)) {
    throw new Error('Filters need to be removed before importing, cancelling import')
  }
}

function calculateNewBalance(fireTable: FireTable, previewContext: PreviewPipelineContext): number {
  const excludedHashes = new Set<string>([
    ...previewContext?.duplicateHashes ?? [],
    ...previewContext?.ruleEngine?.removedHashes ?? [],
  ])

  const amountColIndex = FireTable.getFireColumnIndex('amount')
  const validAmounts: number[] = []

  for (const row of fireTable.data) {
    const hash = getRowHash(row)
    if (!excludedHashes.has(hash)) {
      const amount = row[amountColIndex]
      if (isNumeric(amount)) {
        validAmounts.push(Number(amount))
      }
    }
  }

  return AccountUtils.calculateNewBalance(previewContext.config.getAccountId(), validAmounts)
}

/**
 * Wraps a pipeline function with standardised error handling and logging.
 */
function withPipelineLogger(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  const originalMethod = descriptor.value
  descriptor.value = function (this: unknown, ...args: unknown[]) {
    try {
      Logger.time(propertyKey)
      const result = originalMethod.apply(this, args)
      return result
    }
    catch (error) {
      Logger.error(error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
    finally {
      Logger.timeEnd(propertyKey)
    }
  }
  return descriptor
}

class PipelineRPC {
  static setupCommonPipeline<C extends PipelineContext>(bankAccount: string, context: C, dryRun = false): Pipeline<Table, FireTable, C> {
    let pipeline = Pipeline.create<Table, C>()
      .addStage(removeEmptyRowsStage)

    const rawRulesData = RuleSheet.getRulesData()
    const { rules, warnings } = parseRulesByAccount(rawRulesData, bankAccount)

    if (FEATURES.RULE_ENGINE_ENABLED) {
      context.ruleEngine = {
        warnings: warnings,
        rulesCount: rules.length,
        appliedRules: [],
        rowExcludedRule: {},
        removedHashes: new Set<string>(),
      }

      pipeline = pipeline.addStage(input => applyPreTransformRulesStage(input, context, rules))
    }

    let transformedPipeline = pipeline.addStage(transformToFireTableStage)

    if (FEATURES.RULE_ENGINE_ENABLED) {
      transformedPipeline = transformedPipeline.addStage(input => postTransformRulesStage(input, context, rules, dryRun))
    }

    return transformedPipeline
  }

  /**
   * Handles incoming CSV (already parsed by the frontend) and processes it in order to be imported
   * into the spreadsheet.
   *
   * It uses configuration from the user to determine how the CSV should be processed.
   *
   * @param {RawTable} rawTable - The table object which contains the CSV data
   * @param {string} bankAccount - The bank account identifier which is used to lookup configuration
   * @returns {ServerResponse} A response object which contains a message to be displayed to the user
   */
  @withPipelineLogger
  static importPipeline(
    rawTable: RawTable,
    bankAccount: string,
    userDecisions?: Record<string, TransactionAction>,
  ): ServerResponse<{
    ruleEngine?: PackedRuleEngineResult
  }> {
    const fireSheet = new FireSheet()
    const accountConfig = Config.getAccountConfiguration(bankAccount)
    const userDecisionsMap = userDecisions ? new Map(Object.entries(userDecisions)) : undefined

    Logger.log('account configuration used for import', accountConfig)

    prepareSheetForImport(fireSheet)

    const context: ImportPipelineContext = {
      config: accountConfig,
      userDecisions: userDecisionsMap,
    }

    const inputTable = Table.from(structuredClone(rawTable))

    const pipeline = this.setupCommonPipeline<ImportPipelineContext>(bankAccount, context)

    const fireTable = pipeline
      .addStage(applyUserDecisionsStage)
      .addStage(sortByDateStage)
      .execute(inputTable, context)

    if (fireTable.isEmpty()) {
      const msg = 'No rows to import, check your import data, rules, row decisions or configuration!'
      Logger.log(msg)
      return { success: false, error: msg }
    }

    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    fireSheet.importData(fireTable, autoFillColumns)

    const appliedRules = context?.ruleEngine?.appliedRules || []

    const rulesMsg = appliedRules.length > 0 ? ` (Applied ${appliedRules.length} rules)` : ''
    const msg = `imported ${fireTable.getRowCount()} rows!${rulesMsg}`
    Logger.log(msg)

    return {
      success: true,
      message: msg,
      data: {
        ...(context.ruleEngine
          ? {
              ruleEngine: {
                ...context.ruleEngine,
                removedHashes: Array.from(context.ruleEngine.removedHashes),
              },
            }
          : {}),
      },
    }
  }

  @withPipelineLogger
  static previewPipeline(
    table: RawTable,
    bankAccount: string,
  ): ServerResponse<ImportPreviewResult> {
    const config = Config.getAccountConfiguration(bankAccount)
    const rawTable = Table.from(structuredClone(table))

    const context: PreviewPipelineContext = {
      config,
      duplicateHashes: new Set(),
    }

    let pipeline = this.setupCommonPipeline<PreviewPipelineContext>(bankAccount, context, true)

    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      pipeline = pipeline.addStage(duplicateDetectionStage)
    }

    pipeline = pipeline
      .addStage(sortByDateStage)
      .addStage(autoFillPreviewStage)

    const previewTable = pipeline.execute(rawTable, context)

    const newBalance = calculateNewBalance(previewTable, context)

    const result = {
      success: true,
      data: {
        table: previewTable.pack(),
        newBalance: newBalance,
        duplicateHashes: Array.from(context.duplicateHashes),
        ...(context.ruleEngine
          ? {
              ruleEngine: {
                ...context.ruleEngine,
                removedHashes: Array.from(context.ruleEngine.removedHashes),
              },
            }
          : {}),
      },
    } satisfies ServerResponse<ImportPreviewResult>

    Logger.log('newBalance', result.data.newBalance)
    Logger.log('duplicateHashes', result.data.duplicateHashes)
    Logger.log('rule engine result', result.data?.ruleEngine)

    return result
  }
}

// exported pipeline functions which can be called by the frontend
export const importPipeline = PipelineRPC.importPipeline.bind(PipelineRPC)
export const previewPipeline = PipelineRPC.previewPipeline.bind(PipelineRPC)
