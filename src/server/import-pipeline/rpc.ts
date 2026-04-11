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
}

/**
 * Classifies each transaction row as valid or duplicate, formats the
 * row for display, and collects the numeric amounts for valid rows.
 */
function buildPreviewRows(
  previewTable: FireTable,
  existingHashes: Set<string>,
  autoFillColumns: number[],
): PreviewRowsResult {
  const rows: string[][] = []
  const hashes: string[] = []
  const transactionMeta: Record<string, TransactionMeta> = {}
  const validAmounts: number[] = []
  const amountColIndex = FireTable.getFireColumnIndex('amount')
  let duplicateCount = 0
  let validCount = 0

  for (const row of previewTable.getData()) {
    const hash = getRowHash(row)
    let status: TransactionStatus
    const action: TransactionAction = 'import'

    if (existingHashes.has(hash)) {
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
    transactionMeta[hash] = { status, action }
  }

  return { rows, hashes, transactionMeta, validAmounts, duplicateCount, validCount }
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

/**
 * Processes raw input data into the structured Firesheet format,
 * applying filtering and sorting rules.
 *
 * @param {RawTable} inputTable - The raw input data
 * @param {Config} accountConfig - The configuration for the account
 * @returns {FireTable} The processed data, ready for import
 */
function processImportData(inputTable: RawTable, accountConfig: Config): FireTable {
  const cloned = structuredClone(inputTable)
  const rawTable = new Table(cloned)

  // retrieve the header row and separate from the actual input data
  const headerRow = rawTable.shiftRow() as string[] | undefined

  if (!headerRow || headerRow.length === 0) {
    throw new Error('No header row detected in import data!')
  }

  //
  // BEFORE IMPORT RULES
  //
  rawTable.removeEmptyRows()

  //
  // IMPORT RULES
  //
  return FireTable.fromCSV({
    headers: headerRow,
    rows: rawTable.getData(),
    config: accountConfig,
  }).sortByDate()
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

    const fireTable = processImportData(inputTable, accountConfig)

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

    const msg = `imported ${finalTable.getRowCount()} rows!`
    Logger.log(msg)

    return { success: true, message: msg }
  }

  @withLogger
  static previewPipeline(
    table: RawTable,
    bankAccount: string,
  ): ServerResponse<ImportPreviewReport> {
    const config = Config.getAccountConfiguration(bankAccount)
    const previewTable = processImportData(table, config)

    let existingHashes: Set<string> = new Set()

    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      const fireSheet = new FireSheet()
      existingHashes = loadExistingHashes(fireSheet)
      Logger.log(`Loaded ${existingHashes.size} existing transaction hashes for duplicate detection`)
      Logger.log('Existing hashes sample', Array.from(existingHashes).slice(0, 5))
    }

    const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : []
    const { rows, hashes, transactionMeta, validAmounts, duplicateCount, validCount }
      = buildPreviewRows(previewTable, existingHashes, autoFillColumns)

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
          // PENDING IMPLEMENTATION
          removedCount: 0,
          rulesApplied: 0,
        },
      },
    }
  }
}

export const importPipeline = PipelineRPC.importPipeline.bind(PipelineRPC)
export const previewPipeline = PipelineRPC.previewPipeline.bind(PipelineRPC)
