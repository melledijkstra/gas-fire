import type {
  ServerResponse,
  RawTable,
  ImportPreviewReport,
  UserDecisions,
  TransactionAction,
  TransactionStatus,
  TransactionMeta,
} from '@/common/types'
import { Config } from '../config'
import { FireTable } from '../table/FireTable'
import type { CellValue } from '../table/types'
import { FireSheet } from '../spreadsheet/FireSheet'
import { RuleSheet } from '../spreadsheet/RuleSheet'
import { parseRules, applyPreTransformRules, applyPostTransformRules } from '../rule-engine'
import type { RuleWarning } from '../rule-engine'
import { Table } from '../table/Table'
import { AccountUtils, isNumeric } from '../accounts/account-utils'
import { structuredClone } from '@/common/helpers'
import { Logger } from '@/common/logger'
import { removeFilterCriteria } from '../spreadsheet/spreadsheet'
import { FEATURES } from '@/common/settings'
import { getRowHash } from '../deduplication/duplicate-finder'

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
  validAmounts: number[]
  duplicateCount: number
  validCount: number
  removedCount: number
}

/**
 * Classifies each transaction row as valid or duplicate, formats the
 * row for display, and collects the numeric amounts for valid rows.
 */
function buildPreviewRows(
  previewTable: FireTable,
  existingHashes: Set<string>,
  autoFillColumns: number[],
  excludedHashes: Set<string>,
  excludedByRule: Map<string, string>,
): PreviewRowsResult {
  const rows: string[][] = []
  const hashes: string[] = []
  const transactionMeta: Record<string, TransactionMeta> = {}
  const validAmounts: number[] = []
  const amountColIndex = FireTable.getFireColumnIndex('amount')
  let duplicateCount = 0
  let validCount = 0
  let removedCount = 0

  for (const row of previewTable.getData()) {
    const hash = getRowHash(row)
    let status: TransactionStatus
    let action: TransactionAction = 'import'
    let ruleName: string | undefined

    if (excludedHashes.has(hash)) {
      status = 'removed'
      action = 'skip'
      ruleName = excludedByRule.get(hash)
      removedCount++
    }
    else if (existingHashes.has(hash)) {
      status = 'duplicate'
      duplicateCount++
    }
    else {
      status = 'valid'
      validCount++
      const amount = row[amountColIndex]
      if (isNumeric(amount)) {
        validAmounts.push(Number(amount))
      }
    }

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
    transactionMeta[hash] = { status, action, ruleName }
  }

  return { rows, hashes, transactionMeta, validAmounts, duplicateCount, validCount, removedCount }
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

interface ProcessResult {
  fireTable: FireTable
  excludedHashes: Set<string>
  excludedByRule: Map<string, string>
  rulesAppliedCount: number
  warnings: RuleWarning[]
}

/**
 * Processes raw input data into the structured Firesheet format,
 * applying filtering, sorting, and rule engine logic.
 *
 * @param {RawTable} inputTable - The raw input data
 * @param {Config} accountConfig - The configuration for the account
 * @param {string} bankAccount - The bank account name for filtering rules
 * @param {boolean} isPreview - If true, EXCLUDE rules won't drop the row physically
 * @returns {ProcessResult} The processed data and rule metadata
 */
function processImportData(
  inputTable: RawTable,
  accountConfig: Config,
  bankAccount: string,
  isPreview: boolean,
): ProcessResult {
  const cloned = structuredClone(inputTable)
  const rawTable = new Table(cloned)

  // retrieve the header row and separate from the actual input data
  const headerRow = rawTable.shiftRow() as string[] | undefined

  if (!headerRow || headerRow.length === 0) {
    throw new Error('No header row detected in import data!')
  }

  rawTable.removeEmptyRows()

  // Fetch and parse rules
  const rawRulesData = RuleSheet.getRulesData()
  const { rules, warnings: parserWarnings } = parseRules(rawRulesData)

  // PRE_TRANSFORM
  const preTransformResult = applyPreTransformRules(rawTable, headerRow, rules, bankAccount)

  // Transform to FireTable
  let fireTable = FireTable.fromCSV({
    headers: headerRow,
    rows: rawTable.getData(),
    config: accountConfig,
  })

  // POST_TRANSFORM
  const postTransformResult = applyPostTransformRules(fireTable, rules, bankAccount)

  const warnings = [...parserWarnings, ...preTransformResult.warnings, ...postTransformResult.warnings]
  const rulesAppliedCount = (preTransformResult.rulesAppliedCount || 0) + (postTransformResult.rulesAppliedCount || 0)

  // Map excluded indices to hashes before sorting alters row order
  const excludedHashes = new Set<string>()
  const excludedByRule = new Map<string, string>()
  const data = fireTable.getData()

  for (const index of preTransformResult.excludedIndices) {
    const hash = getRowHash(data[index])
    excludedHashes.add(hash)
    excludedByRule.set(hash, preTransformResult.excludedByRule.get(index)!)
  }
  for (const index of postTransformResult.excludedIndices) {
    const hash = getRowHash(data[index])
    excludedHashes.add(hash)
    excludedByRule.set(hash, postTransformResult.excludedByRule.get(index)!)
  }

  // Remove rows permanently if this is an actual import (not preview)
  if (!isPreview && excludedHashes.size > 0) {
    const filteredData = data.filter(row => !excludedHashes.has(getRowHash(row)))
    fireTable = new FireTable(filteredData)
  }

  fireTable.sortByDate()

  return { fireTable, excludedHashes, excludedByRule, rulesAppliedCount, warnings }
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
  ): ServerResponse<{ message: string, rulesAppliedCount: number, ruleWarnings: RuleWarning[] }> {
    const fireSheet = new FireSheet()
    const accountConfig = Config.getAccountConfiguration(bankAccount)
    const _userDecisions = userDecisions ? new Map(Object.entries(userDecisions)) : undefined

    Logger.log('account configuration used for import', accountConfig)

    prepareSheetForImport(fireSheet)

    const { fireTable, rulesAppliedCount, warnings } = processImportData(inputTable, accountConfig, bankAccount, false)

    if (fireTable.isEmpty()) {
      const msg = 'No rows to import, check your import data, rules, or configuration!'
      Logger.log(msg)
      return { success: false, error: msg }
    }

    const finalTable = applyUserDecisions(fireTable, _userDecisions)

    if (finalTable.isEmpty()) {
      const msg = 'No rows to import after applying user decisions.'
      Logger.log(msg)
      return { success: false, error: msg }
    }

    Logger.time('FireSheet.importData')
    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    fireSheet.importData(finalTable, autoFillColumns)
    Logger.timeEnd('FireSheet.importData')

    const rulesMsg = rulesAppliedCount > 0 ? ` (Applied ${rulesAppliedCount} rules)` : ''
    const msg = `imported ${finalTable.getRowCount()} rows!${rulesMsg}`
    Logger.log(msg)

    return {
      success: true,
      data: {
        message: msg,
        rulesAppliedCount,
        ruleWarnings: warnings,
      },
    }
  }

  @withLogger
  static previewPipeline(
    table: RawTable,
    bankAccount: string,
  ): ServerResponse<ImportPreviewReport> {
    const config = Config.getAccountConfiguration(bankAccount)

    const {
      fireTable: previewTable,
      excludedHashes,
      excludedByRule,
      rulesAppliedCount,
      warnings,
    } = processImportData(table, config, bankAccount, true)

    let existingHashes: Set<string> = new Set()

    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      const fireSheet = new FireSheet()
      existingHashes = loadExistingHashes(fireSheet)
      Logger.log(`Loaded ${existingHashes.size} existing transaction hashes for duplicate detection`)
      Logger.log('Existing hashes sample', Array.from(existingHashes).slice(0, 5))
    }

    const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : []
    const { rows, hashes, transactionMeta, validAmounts, duplicateCount, validCount, removedCount }
      = buildPreviewRows(previewTable, existingHashes, autoFillColumns, excludedHashes, excludedByRule)

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
          rulesApplied: rulesAppliedCount,
        },
        ruleWarnings: warnings,
      },
    }
  }
}

export const importPipeline = PipelineRPC.importPipeline.bind(PipelineRPC)
export const previewPipeline = PipelineRPC.previewPipeline.bind(PipelineRPC)
