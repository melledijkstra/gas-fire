import type { ServerResponse, RawTable, ImportPreviewReport, UserDecisions, TransactionAction, TransactionStatus } from '@/common/types';
import { Config } from '../config';
import { FireTable, FireSheet } from '../table';
import { Table } from '../table/Table';
import { AccountUtils, isNumeric } from '../accounts/account-utils';
import { structuredClone } from '@/common/helpers';
import { Logger } from '@/common/logger';
import { removeFilterCriteria } from '../utils/spreadsheet';
import { FEATURES } from '@/common/settings';
import { getRowHash } from '../duplicate-finder';

/**
 * Loads hashes of already-imported transactions from the sheet for duplicate detection.
 * Returns an empty set if the data cannot be retrieved.
 */
function loadExistingHashes(fireSheet: FireSheet, compareIndices: number[]): Set<string> {
  const existingHashes = new Set<string>();
  try {
    const lastImportedTransactions = fireSheet.getLastImportedTransactions();
    if (lastImportedTransactions) {
      for (const row of lastImportedTransactions.getData()) {
        existingHashes.add(getRowHash(row, compareIndices));
      }
    }
  } catch (e) {
    Logger.warn('Could not retrieve last imported transactions for duplicate detection', e);
  }
  return existingHashes;
}

/**
 * Filters rows based on explicit user decisions.
 * Rows default to 'import' unless the user has explicitly decided otherwise.
 */
function filterRowsByDecisions(
  rows: ReturnType<FireTable['getData']>,
  compareIndices: number[],
  userDecisions: UserDecisions
): ReturnType<FireTable['getData']> {
  return rows.filter(row => {
    const hash = getRowHash(row, compareIndices);
    const action: TransactionAction = userDecisions[hash] ?? 'import';
    return action === 'import';
  });
}

/**
 * Formats a single cell value to a display string.
 * Dates are formatted as 'yyyy-MM-dd' using the spreadsheet's timezone.
 */
function formatCellValue(cell: unknown): string {
  if (cell instanceof Date) {
    try {
      const timeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
      return Utilities.formatDate(cell, timeZone, "yyyy-MM-dd");
    } catch {
      return cell.toISOString().split('T')[0];
    }
  }
  return String(cell ?? '');
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
  const rawTable = new Table(cloned);

  // retrieve the header row and separate from the actual input data
  const headerRow = rawTable.shiftRow() as string[] | undefined;

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
  const fireTable = FireTable.fromCSV({
    headers: headerRow,
    rows: rawTable.getData(),
    config: accountConfig,
  })
  // ^^ result is now in the firesheet structure

  fireTable.sortByDate()

  return fireTable
}

/**
 * This very function might be the core of this spreadsheet and project.
 * It handles incoming CSV (already parsed by the frontend) and processes it in order to be imported
 * into the spreadsheet.
 *
 * It uses configuration from the user to determine how the CSV should be processed.
 *
 * @param {RawTable} inputTable - The table object which contains the CSV data
 * @param {string} bankAccount - The bank account identifier which is used to lookup configuration
 * @returns {ServerResponse} A response object which contains a message to be displayed to the user
 */
export function importPipeline(
  inputTable: RawTable,
  bankAccount: string,
  userDecisions?: UserDecisions
): ServerResponse {
  try {
    Logger.time('importPipeline')

    const fireSheet = new FireSheet()
    const accountConfig = Config.getAccountConfiguration(bankAccount)

    Logger.log('account configuration used for import', accountConfig)

    if (!accountConfig) {
      throw new Error(
        `Bank with identifier "${bankAccount}" does not have valid configuration!`
      )
    }

    // make the user visually switch to the primary sheet where data will be imported
    fireSheet.activate()

    // remove any filters that might be set
    // importing might go wrong when filters are set
    const filter = fireSheet.getFilter()

    if (filter) {
      if (!removeFilterCriteria(filter, true)) {
        throw new Error(
          'Filters need to be removed before importing, cancelling import'
        );
      }
    }

    const fireTable = processImportData(inputTable, accountConfig);

    if (fireTable.isEmpty()) {
      const msg = 'No rows to import, check your import data or configuration!';
      Logger.log(msg);
      return { success: false, error: msg };
    }

    let finalTable = fireTable;

    if (FEATURES.IMPORT_DUPLICATE_DETECTION || userDecisions) {
      const compareIndices = FireTable.getCompareIndices();

      if (userDecisions) {
        finalTable = new FireTable(filterRowsByDecisions(fireTable.getData(), compareIndices, userDecisions));
      }
    }

    if (finalTable.isEmpty()) {
      const msg = 'No rows to import after applying rules and user decisions.';
      Logger.log(msg);
      return { success: false, error: msg };
    }

    // actual importing of the data into the sheet
    Logger.time('FireSheet.importData')

    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    fireSheet.importData(finalTable, autoFillColumns)

    Logger.timeEnd('FireSheet.importData')

    const msg = `imported ${finalTable.getRowCount()} rows!`;
    Logger.log(msg)

    Logger.timeEnd('importPipeline')

    return {
      success: true,
      message: msg,
    };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

export function previewPipeline(
  table: RawTable,
  bankAccount: string
): ServerResponse<ImportPreviewReport> {
  try {
    const config = Config.getAccountConfiguration(bankAccount);

    if (!config) {
      throw new Error(`Configuration for account ${bankAccount} not found`);
    }

    // Process the data using the exact same logic as the actual import
    const fireTable = processImportData(table, config);

    const compareIndices = FireTable.getCompareIndices();

    // We always detect duplicates in preview, even if the feature is toggled off for general import,
    // so that the user gets transparency and control.
    const fireSheet = new FireSheet();
    const existingHashes = loadExistingHashes(fireSheet, compareIndices);

    const summary = {
      totalRows: fireTable.getRowCount(),
      validCount: 0,
      removedCount: 0,
      duplicateCount: 0,
      rulesApplied: 0
    };

    const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : [];

    // We only want to include valid and kept items for the new balance calculation
    const validAmountNumbers: number[] = [];

    const rows: string[][] = [];
    const hashes: string[] = [];
    const transactionMeta: ImportPreviewReport['transactionMeta'] = {};

    for (const row of fireTable.getData()) {
      const hash = getRowHash(row, compareIndices);
      let status: TransactionStatus;
      const action: TransactionAction = 'import';

      if (existingHashes.has(hash)) {
        status = 'duplicate';
        summary.duplicateCount++;
      } else {
        status = 'valid';
        summary.validCount++;
        // extract the amount before formatting the row visually
        const amountStr = String(row[fireTable.getFireColumnIndex('amount')] ?? '');
        if (isNumeric(amountStr)) {
          validAmountNumbers.push(Number(amountStr));
        }
      }

      const formattedRow = [...row];
      for (const colIndex of autoFillColumns) {
        const arrayIndex = colIndex - 1;
        if (arrayIndex >= 0 && arrayIndex < formattedRow.length) {
          if (!formattedRow[arrayIndex] || formattedRow[arrayIndex] === '') {
            formattedRow[arrayIndex] = '(auto-filled)';
          }
        }
      }

      hashes.push(hash);
      rows.push(formattedRow.map(formatCellValue));
      transactionMeta[hash] = { status, action };
    }

    const newBalance = AccountUtils.calculateNewBalance(bankAccount, validAmountNumbers);

    return {
      success: true,
      data: {
        rows,
        hashes,
        transactionMeta,
        newBalance,
        summary
      }
    };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
