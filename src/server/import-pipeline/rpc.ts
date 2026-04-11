import type {
  ServerResponse,
  RawTable,
  ImportPreviewReport,
  UserDecisions,
  TransactionAction,
  TransactionStatus,
  TransactionMeta,
  RowRuleInfo,
} from '@/common/types'
import { Config } from '../config'
import { FireTable } from '../table/FireTable'
import type { CellValue } from '../table/types'
import { FireSheet } from '../spreadsheet/FireSheet'
import { Table } from '../table/Table'
import { AccountUtils, isNumeric } from '../accounts/account-utils'
import { structuredClone } from '@/common/helpers'
import { Logger } from '@/common/logger'
import { removeFilterCriteria } from '../spreadsheet/spreadsheet'
import { FEATURES } from '@/common/settings'
import { getRowHash } from '../deduplication/duplicate-finder'
import {
  loadImportRules,
  getRulesForBank,
  getRulesForPhase,
  processRules,
  createRawColumnResolver,
  createFireColumnResolver,
} from '../rule-engine'
import type { RuleProcessingResult, RowRuleResult } from '../rule-engine'

/**
 * Loads hashes of already-imported transactions from the sheet for duplicate detection.
 * Returns an empty set if the data cannot be retrieved.
 */
function loadExistingHashes(fireSheet: FireSheet): Set<string> {
  const existingHashes = new Set<string>()
  try {
    const lastImportedTransactions = fireSheet.getLastImportedTransactions({
      stopOnDifferentImportDate: false,
    })
    if (lastImportedTransactions) {
      for (const row of lastImportedTransactions.getData()) {
        existingHashes.add(getRowHash(row))
      }
    }
  }
  catch (e) {
    Logger.warn('Could not retrieve last imported transactions for duplicate detection', e)
  }
  return existingHashes
}

/**
 * Filters rows based on explicit user decisions.
 * Rows default to 'import' unless the user has explicitly decided otherwise.
 */
function filterRowsByDecisions(
  rows: ReturnType<FireTable['getData']>,
  userDecisions: UserDecisions,
): ReturnType<FireTable['getData']> {
  return rows.filter((row) => {
    const hash = getRowHash(row)
    const action: TransactionAction = userDecisions.get(hash) ?? 'import'
    return action === 'import'
  })
}

/**
 * Formats a single cell value to a display string.
 * Dates are formatted as 'yyyy-MM-dd' using the spreadsheet's timezone.
 */
function formatCellValue(cell: CellValue): string {
  if (cell instanceof Date) {
    try {
      const timeZone = FireSheet.getTimeZone()
      return Utilities.formatDate(cell, timeZone, 'yyyy-MM-dd')
    }
    catch {
      return cell.toISOString().split('T')[0]
    }
  }
  return String(cell ?? '')
}

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

/**
 * Applies user decisions to the processed fire table, returning a
 * filtered table containing only the rows the user chose to import.
 * Returns the original table unchanged when no decisions apply.
 */
function applyUserDecisions(
  fireTable: FireTable,
  userDecisions?: UserDecisions,
): FireTable {
  if (userDecisions?.size) {
    return new FireTable(filterRowsByDecisions(fireTable.getData(), userDecisions))
  }
  return fireTable
}

/** Intermediate result from classifying and formatting preview rows. */
interface PreviewRowsResult {
  rows: string[][]
  hashes: string[]
  transactionMeta: Record<string, TransactionMeta>
  ruleInfo: Record<string, RowRuleInfo>
  validAmounts: number[]
  duplicateCount: number
  validCount: number
  removedCount: number
}

/** Classifies a row's status based on rule results and existing hashes. */
function classifyRow(
  hash: string,
  rowResult: RowRuleResult | undefined,
  existingHashes: Set<string>,
): TransactionStatus {
  if (rowResult?.excluded) return 'removed'
  if (existingHashes.has(hash)) return 'duplicate'
  return 'valid'
}

/** Collects rule info for a single row (exclusion or modification details). */
function collectRowRuleInfo(
  hash: string,
  rowResult: RowRuleResult | undefined,
  ruleInfo: Record<string, RowRuleInfo>,
): void {
  if (!rowResult) return

  if (rowResult.excluded && rowResult.excludedByRule) {
    ruleInfo[hash] = { excludedByRule: rowResult.excludedByRule }
    return
  }

  if (rowResult.matchedRules.length > 0 && !rowResult.excluded) {
    const modifications: Record<string, string> = {}
    for (const [col, val] of Object.entries(rowResult.modifications)) {
      modifications[col] = String(val ?? '')
    }
    if (Object.keys(modifications).length > 0) {
      ruleInfo[hash] = { ...ruleInfo[hash], modifications }
    }
  }
}

/**
 * Classifies each transaction row as valid, duplicate, or removed (by rule),
 * formats the row for display, and collects the numeric amounts for valid rows.
 */
function buildPreviewRows(
  previewTable: FireTable,
  existingHashes: Set<string>,
  autoFillColumns: number[],
  rowRuleResults?: RowRuleResult[],
): PreviewRowsResult {
  const rows: string[][] = []
  const hashes: string[] = []
  const transactionMeta: Record<string, TransactionMeta> = {}
  const ruleInfo: Record<string, RowRuleInfo> = {}
  const validAmounts: number[] = []
  const amountColIndex = FireTable.getFireColumnIndex('amount')
  let duplicateCount = 0
  let validCount = 0
  let removedCount = 0

  const data = previewTable.getData()
  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    const hash = getRowHash(row)
    const rowResult = rowRuleResults?.[i]
    const status = classifyRow(hash, rowResult, existingHashes)

    if (status === 'removed') removedCount++
    else if (status === 'duplicate') duplicateCount++
    else {
      validCount++
      const amount = row[amountColIndex]
      if (isNumeric(amount)) validAmounts.push(Number(amount))
    }

    collectRowRuleInfo(hash, rowResult, ruleInfo)

    const formattedRow = [...row]
    for (const colIndex of autoFillColumns) {
      const arrayIndex = colIndex - 1
      if (arrayIndex >= 0 && arrayIndex < formattedRow.length) {
        if (!formattedRow[arrayIndex] || formattedRow[arrayIndex] === '') {
          formattedRow[arrayIndex] = '(auto-filled)'
        }
      }
    }

    hashes.push(hash)
    rows.push(formattedRow.map(formatCellValue))
    transactionMeta[hash] = { status, action: 'import' }
  }

  return { rows, hashes, transactionMeta, ruleInfo, validAmounts, duplicateCount, validCount, removedCount }
}

/**
 * Wraps a pipeline function with standardised error handling and logging.
 */
function withLogger(
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

/** Return type for processImportData, includes rule processing results. */
interface ProcessImportDataResult {
  fireTable: FireTable
  ruleResult: RuleProcessingResult
}

/** Creates an empty RuleProcessingResult with the given rule count. */
function emptyRuleResult(rulesLoaded: number, warnings: RuleProcessingResult['warnings'] = []): RuleProcessingResult {
  return {
    rowResults: [],
    rulesLoaded,
    rulesApplied: 0,
    rowsExcluded: 0,
    rowsModified: 0,
    warnings: [...warnings],
  }
}

/**
 * Merges two RuleProcessingResults.
 * Row results from the second are appended if the first has none;
 * otherwise they are merged per-index (for two-phase processing on the same row set).
 */
function mergeRuleResults(a: RuleProcessingResult, b: RuleProcessingResult): RuleProcessingResult {
  let mergedRowResults: RowRuleResult[]

  if (a.rowResults.length === 0) {
    mergedRowResults = b.rowResults
  }
  else if (b.rowResults.length === 0) {
    mergedRowResults = a.rowResults
  }
  else {
    // Merge per-index: a row excluded by either phase stays excluded
    mergedRowResults = a.rowResults.map((aRow, i) => {
      const bRow = b.rowResults[i]
      if (!bRow) return aRow
      return {
        excluded: aRow.excluded || bRow.excluded,
        excludedByRule: aRow.excludedByRule ?? bRow.excludedByRule,
        matchedRules: [...aRow.matchedRules, ...bRow.matchedRules],
        modifications: { ...aRow.modifications, ...bRow.modifications },
      }
    })
  }

  return {
    rowResults: mergedRowResults,
    rulesLoaded: a.rulesLoaded,
    rulesApplied: a.rulesApplied + b.rulesApplied,
    rowsExcluded: mergedRowResults.filter(r => r.excluded).length,
    rowsModified: mergedRowResults.filter(r => !r.excluded && Object.keys(r.modifications).length > 0).length,
    warnings: [...a.warnings, ...b.warnings],
  }
}

/**
 * Processes raw input data into the structured Firesheet format,
 * applying import rules, filtering, and sorting.
 *
 * @param inputTable - The raw input data
 * @param accountConfig - The configuration for the account
 * @param dryRun - If true, rules track results without mutating (for preview)
 * @returns The processed FireTable and rule processing results
 */
function processImportData(
  inputTable: RawTable,
  accountConfig: Config,
  dryRun: boolean = false,
): ProcessImportDataResult {
  const cloned = structuredClone(inputTable)
  const rawTable = new Table(cloned)

  // retrieve the header row and separate from the actual input data
  const headerRow = rawTable.shiftRow() as string[] | undefined

  if (!headerRow || headerRow.length === 0) {
    throw new Error('No header row detected in import data!')
  }

  // Load rules
  const { rules, warnings: loadWarnings } = loadImportRules()
  const bankRules = getRulesForBank(rules, accountConfig.getAccountId())
  let combinedResult = emptyRuleResult(rules.length, loadWarnings)

  //
  // BEFORE IMPORT RULES (PRE_TRANSFORM phase)
  //
  rawTable.removeEmptyRows()

  const preRules = getRulesForPhase(bankRules, 'PRE_TRANSFORM')
  if (preRules.length > 0) {
    const preResult = processRules(
      rawTable,
      preRules,
      createRawColumnResolver(headerRow),
      dryRun,
    )
    combinedResult = mergeRuleResults(combinedResult, preResult)

    if (!dryRun) {
      const excludedIndices = preResult.rowResults
        .map((r, i) => r.excluded ? i : -1)
        .filter(i => i !== -1)
      if (excludedIndices.length > 0) {
        rawTable.deleteRows(excludedIndices)
      }
    }
  }

  //
  // IMPORT RULES (transform step)
  //
  const fireTable = FireTable.fromCSV({
    headers: headerRow,
    rows: rawTable.getData(),
    config: accountConfig,
  })

  // POST_TRANSFORM phase
  const postRules = getRulesForPhase(bankRules, 'POST_TRANSFORM')
  if (postRules.length > 0) {
    const postResult = processRules(
      fireTable,
      postRules,
      createFireColumnResolver(),
      dryRun,
    )
    combinedResult = mergeRuleResults(combinedResult, postResult)

    if (!dryRun) {
      const excludedIndices = postResult.rowResults
        .map((r, i) => r.excluded ? i : -1)
        .filter(i => i !== -1)
      if (excludedIndices.length > 0) {
        fireTable.deleteRows(excludedIndices)
      }
    }
  }

  fireTable.sortByDate()

  return { fireTable, ruleResult: combinedResult }
}

class PipelineRPC {
  /**
   * Handles incoming CSV (already parsed by the frontend) and processes it in order to be imported
   * into the spreadsheet.
   *
   * It uses configuration from the user to determine how the CSV should be processed.
   *
   * @param {RawTable} inputTable - The table object which contains the CSV data
   * @param {string} bankAccount - The bank account identifier which is used to lookup configuration
   * @returns {ServerResponse} A response object which contains a message to be displayed to the user
   */
  @withLogger
  static importPipeline(
    inputTable: RawTable,
    bankAccount: string,
    userDecisions?: Record<string, TransactionAction>,
  ): ServerResponse {
    const fireSheet = new FireSheet()
    const accountConfig = Config.getAccountConfiguration(bankAccount)
    const _userDecisions = userDecisions ? new Map(Object.entries(userDecisions)) : undefined

    Logger.log('account configuration used for import', accountConfig)

    prepareSheetForImport(fireSheet)

    const { fireTable, ruleResult } = processImportData(inputTable, accountConfig, false)

    if (fireTable.isEmpty()) {
      const msg = 'No rows to import, check your import data or configuration!'
      Logger.log(msg)
      return { success: false, error: msg }
    }

    const finalTable = applyUserDecisions(fireTable, _userDecisions)

    if (finalTable.isEmpty()) {
      const msg = 'No rows to import after applying rules and user decisions.'
      Logger.log(msg)
      return { success: false, error: msg }
    }

    Logger.time('FireSheet.importData')
    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    fireSheet.importData(finalTable, autoFillColumns)
    Logger.timeEnd('FireSheet.importData')

    const parts = [`imported ${finalTable.getRowCount()} rows!`]
    if (ruleResult.rulesApplied > 0) {
      parts.push(`${ruleResult.rulesApplied} rule(s) applied`)
    }
    if (ruleResult.rowsExcluded > 0) {
      parts.push(`${ruleResult.rowsExcluded} row(s) excluded by rules`)
    }
    const msg = parts.join(' — ')
    Logger.log(msg)

    return { success: true, message: msg }
  }

  @withLogger
  static previewPipeline(
    table: RawTable,
    bankAccount: string,
  ): ServerResponse<ImportPreviewReport> {
    const config = Config.getAccountConfiguration(bankAccount)
    const { fireTable: previewTable, ruleResult } = processImportData(table, config, true)

    let existingHashes: Set<string> = new Set()

    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      const fireSheet = new FireSheet()
      existingHashes = loadExistingHashes(fireSheet)
      Logger.log(`Loaded ${existingHashes.size} existing transaction hashes for duplicate detection`)
      Logger.log('Existing hashes sample', Array.from(existingHashes).slice(0, 5))
    }

    const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : []
    const { rows, hashes, transactionMeta, ruleInfo, validAmounts, duplicateCount, validCount, removedCount }
      = buildPreviewRows(previewTable, existingHashes, autoFillColumns, ruleResult.rowResults)

    const newBalance = AccountUtils.calculateNewBalance(bankAccount, validAmounts)

    return {
      success: true,
      data: {
        rows,
        hashes,
        transactionMeta,
        newBalance,
        summary: {
          totalRows: previewTable.getRowCount(),
          validCount,
          duplicateCount,
          removedCount,
          rulesApplied: ruleResult.rulesApplied,
          rulesLoaded: ruleResult.rulesLoaded,
        },
        ruleInfo: Object.keys(ruleInfo).length > 0 ? ruleInfo : undefined,
        ruleWarnings: ruleResult.warnings.length > 0
          ? ruleResult.warnings.map(w => ({ ruleName: w.ruleName, rowIndex: w.rowIndex, message: w.message }))
          : undefined,
      },
    }
  }
}

export const importPipeline = PipelineRPC.importPipeline.bind(PipelineRPC)
export const previewPipeline = PipelineRPC.previewPipeline.bind(PipelineRPC)
