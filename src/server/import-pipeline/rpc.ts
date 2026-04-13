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
import type { ImportPipelineContext, PreviewPipelineContext } from './pipeline'
import { Config } from '../config'
import { FireSheet } from '../spreadsheet/FireSheet'
import { Table } from '../table/Table'
import { getRowHash, structuredClone } from '@/common/helpers'
import { Logger } from '@/common/logger'
import { removeFilterCriteria } from '../spreadsheet/spreadsheet'
import { FEATURES } from '@/common/settings'
import { AccountUtils, isNumeric } from '../accounts/account-utils'
import { FireTable } from '../table/FireTable'

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
    ...previewContext?.removedHashes ?? [],
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
  ): ServerResponse {
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

    const importPipeline = Pipeline.create<Table, ImportPipelineContext>()
      .addStage(removeEmptyRowsStage)
      .addStage(transformToFireTableStage)
      .addStage(applyUserDecisionsStage)
      .addStage(sortByDateStage)

    const fireTable = importPipeline.execute(inputTable, context)

    if (fireTable.isEmpty()) {
      const msg = 'No rows to import, check your import data, rules, row decisions or configuration!'
      Logger.log(msg)
      return { success: false, error: msg }
    }

    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    fireSheet.importData(fireTable, autoFillColumns)

    const msg = `imported ${fireTable.getRowCount()} rows!`
    Logger.log(msg)

    return { success: true, message: msg }
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
      removedHashes: new Set(),
    }

    let previewPipeline = Pipeline.create<Table, PreviewPipelineContext>()
      .addStage(removeEmptyRowsStage)
      .addStage(transformToFireTableStage)
      .addStage(sortByDateStage)

    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      previewPipeline = previewPipeline.addStage(duplicateDetectionStage)
    }

    previewPipeline = previewPipeline
      .addStage(autoFillPreviewStage)

    const previewTable = previewPipeline.execute(rawTable, context)

    const newBalance = calculateNewBalance(previewTable, context)

    return {
      success: true,
      data: {
        rows: previewTable.data,
        newBalance: newBalance,
        duplicateHashes: context.duplicateHashes,
        removedHashes: context.removedHashes,
      },
    }
  }
}

export const importPipeline = PipelineRPC.importPipeline.bind(PipelineRPC)
export const previewPipeline = PipelineRPC.previewPipeline.bind(PipelineRPC)
