import { getRowHash, structuredClone } from '@/common/helpers'
import { Logger } from '@/common/logger'
import { FEATURES } from '@/common/settings'
import { YMYLTable } from '@/common/table/YMYLTable'
import { Table } from '@/common/table/Table'
import type {
  ImportPreviewResult,
  RawTable,
  ServerResponse,
  TransactionAction,
} from '@/common/types'
import { AccountUtils, isNumeric } from '../accounts/account-utils'
import { Config } from '../config'
import {
  applyPostTransformRules,
  applyPreTransformRules,
  createRuleEngineResult,
} from '../rule-engine/pipeline'
import { RuleParser } from '../rule-engine/rule-parser'
import { RuleProcessor } from '../rule-engine/rule-processor'
import type { PackedRuleEngineResult, RuleEngineResult } from '../rule-engine/types'
import { packRuleEngineResult } from '../rule-engine/types'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import { RuleSheet } from '../spreadsheet/RuleSheet'
import { removeFilterCriteria } from '../spreadsheet/spreadsheet'
import {
  applyUserDecisions,
  autoFillPreview,
  detectDuplicates,
  filterOutExcluded,
  removeEmptyRows,
  transformToYMYLTable,
} from './pipeline'

/**
 * activates the target sheet and removes any active filters.
 * filters must be removed before importing to avoid data corruption.
 */
function prepareSheetForImport(ymylSheet: YMYLSheet): void {
  ymylSheet.activate()

  const filter = ymylSheet.getFilter()
  if (filter && !removeFilterCriteria(filter, true)) {
    throw new Error('Filters need to be removed before importing, cancelling import')
  }
}

/**
 * calculates the new balance after considering non-excluded transactions.
 */
function calculateNewBalance(
  ymylTable: YMYLTable,
  accountId: string,
  excludedHashes: Set<string>,
): number {
  const amountColIndex = YMYLTable.getYMYLColumnIndex('amount')
  const validAmounts: number[] = []

  for (const row of ymylTable.data) {
    const hash = getRowHash(row)
    if (!excludedHashes.has(hash)) {
      const amount = row[amountColIndex]
      if (isNumeric(amount)) {
        validAmounts.push(Number(amount))
      }
    }
  }

  return AccountUtils.calculateNewBalance(accountId, validAmounts)
}

/**
 * fetches and parses rules configured for the given bank account.
 */
function fetchParsingRules(bankAccount: string) {
  const rawRulesData = RuleSheet.getRulesData()
  const ruleParser = new RuleParser()
  return ruleParser.parseRulesByAccount(rawRulesData, bankAccount)
}

/**
 * wraps an RPC function with standardized error handling and execution timing.
 */
function withRpcHandler<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => ServerResponse<TReturn>,
): (...args: TArgs) => ServerResponse<TReturn> {
  return (...args: TArgs): ServerResponse<TReturn> => {
    try {
      Logger.time(name)
      return fn(...args)
    }
    catch (error) {
      Logger.error(error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
    finally {
      Logger.timeEnd(name)
    }
  }
}

/**
 * handles incoming CSV data and returns a preview report for user review.
 */
export const previewPipeline = withRpcHandler(
  'previewPipeline',
  (table: RawTable, bankAccount: string): ServerResponse<ImportPreviewResult> => {
    const config = Config.getAccountConfiguration(bankAccount)
    const rawTable = Table.from(structuredClone(table))
    removeEmptyRows(rawTable)

    let ruleEngineResult: RuleEngineResult | undefined
    let ruleProcessor: RuleProcessor | undefined

    if (FEATURES.RULE_ENGINE_ENABLED) {
      const { rules, warnings } = fetchParsingRules(bankAccount)
      ruleProcessor = new RuleProcessor(rules)
      ruleEngineResult = createRuleEngineResult(rules.length)
      ruleEngineResult.warnings.push(...warnings)

      applyPreTransformRules(rawTable, ruleProcessor, bankAccount, ruleEngineResult)
    }

    const ymylTable = transformToYMYLTable(rawTable, config)

    if (FEATURES.RULE_ENGINE_ENABLED && ruleProcessor && ruleEngineResult) {
      applyPostTransformRules(ymylTable, ruleProcessor, bankAccount, ruleEngineResult, true)
    }

    const duplicateHashes = new Set<string>()
    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      const ymylSheet = new YMYLSheet()
      const existingHashes = ymylSheet.loadExistingHashes()
      Logger.log(`Loaded ${existingHashes?.size} existing transaction hashes for duplicate detection`)
      const found = detectDuplicates(ymylTable, existingHashes)
      for (const hash of found) {
        duplicateHashes.add(hash)
      }
    }

    ymylTable.sortByDate()

    if (config.autoFillEnabled) {
      autoFillPreview(ymylTable, config.autoFillColumnIndices)
    }

    const excludedHashes = new Set<string>([
      ...duplicateHashes,
      ...(ruleEngineResult?.removedHashes ?? []),
    ])
    const newBalance = calculateNewBalance(ymylTable, config.getAccountId(), excludedHashes)

    const result: ServerResponse<ImportPreviewResult> = {
      success: true,
      data: {
        table: ymylTable.pack(),
        newBalance,
        duplicateHashes: Array.from(duplicateHashes),
        ...(ruleEngineResult ? { ruleEngine: packRuleEngineResult(ruleEngineResult) } : {}),
      },
    }

    Logger.log('newBalance', result.data.newBalance)
    Logger.log('duplicateHashes', result.data.duplicateHashes)
    Logger.log('rule engine result', result.data?.ruleEngine)

    return result
  },
)

/**
 * handles incoming CSV and inserts transactions into the spreadsheet.
 */
export const importPipeline = withRpcHandler(
  'importPipeline',
  (
    rawTable: RawTable,
    bankAccount: string,
    userDecisions?: Record<string, TransactionAction>,
  ): ServerResponse<{ ruleEngine?: PackedRuleEngineResult }> => {
    const ymylSheet = new YMYLSheet()
    const accountConfig = Config.getAccountConfiguration(bankAccount)

    Logger.log('account configuration used for import', accountConfig)

    prepareSheetForImport(ymylSheet)

    const table = Table.from(structuredClone(rawTable))
    removeEmptyRows(table)

    let ruleEngineResult: RuleEngineResult | undefined
    let ruleProcessor: RuleProcessor | undefined

    if (FEATURES.RULE_ENGINE_ENABLED) {
      const { rules, warnings } = fetchParsingRules(bankAccount)
      ruleProcessor = new RuleProcessor(rules)
      ruleEngineResult = createRuleEngineResult(rules.length)
      ruleEngineResult.warnings.push(...warnings)

      applyPreTransformRules(table, ruleProcessor, bankAccount, ruleEngineResult)
    }

    let ymylTable = transformToYMYLTable(table, accountConfig)

    if (FEATURES.RULE_ENGINE_ENABLED && ruleProcessor && ruleEngineResult) {
      ymylTable = applyPostTransformRules(ymylTable, ruleProcessor, bankAccount, ruleEngineResult, false)
    }

    applyUserDecisions(ymylTable, userDecisions)
    ymylTable.sortByDate()

    if (ymylTable.isEmpty()) {
      const msg = 'No rows to import, check your import data, rules, row decisions or configuration!'
      Logger.log(msg)
      return { success: false, error: msg }
    }

    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    ymylSheet.importData(ymylTable, autoFillColumns)

    const appliedRules = ruleEngineResult?.appliedRules || []
    const rulesMsg = appliedRules.length > 0 ? ` (Applied ${appliedRules.length} rules)` : ''
    const msg = `imported ${ymylTable.getRowCount()} rows!${rulesMsg}`
    Logger.log(msg)

    return {
      success: true,
      message: msg,
      data: {
        ...(ruleEngineResult ? { ruleEngine: packRuleEngineResult(ruleEngineResult) } : {}),
      },
    }
  },
)

/**
 * dedicated pipeline for background Enable Banking synchronization.
 */
export const enableBankingPipeline = withRpcHandler(
  'enableBankingPipeline',
  (
    ymylTable: YMYLTable,
    bankAccount: string,
  ): ServerResponse<{ ruleEngine?: PackedRuleEngineResult }> => {
    const ymylSheet = new YMYLSheet()
    const config = Config.getAccountConfiguration(bankAccount)

    let ruleEngineResult: RuleEngineResult | undefined
    if (FEATURES.RULE_ENGINE_ENABLED) {
      const { rules, warnings } = fetchParsingRules(bankAccount)
      const ruleProcessor = new RuleProcessor(rules)
      ruleEngineResult = createRuleEngineResult(rules.length)
      ruleEngineResult.warnings.push(...warnings)

      ymylTable = applyPostTransformRules(ymylTable, ruleProcessor, bankAccount, ruleEngineResult, false)
    }

    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      const existingHashes = ymylSheet.loadExistingHashes()
      const duplicates = detectDuplicates(ymylTable, existingHashes)
      filterOutExcluded(ymylTable, duplicates)
    }

    ymylTable.sortByDate()

    if (ymylTable.isEmpty()) {
      const msg = 'No new rows to import after rules and deduplication.'
      Logger.log(msg)
      return { success: true, message: msg, data: {} }
    }

    const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : undefined
    ymylSheet.importData(ymylTable, autoFillColumns)

    const msg = `Synced ${ymylTable.getRowCount()} transactions!`
    Logger.log(msg)

    return {
      success: true,
      message: msg,
      data: {
        ...(ruleEngineResult ? { ruleEngine: packRuleEngineResult(ruleEngineResult) } : {}),
      },
    }
  },
)
