import type { ServerResponse, RawTable } from '@/common/types';
import type { FireColumn } from '@/common/constants';
import { Config } from '../config';
import { FireTable, FireSheet } from '../table';
import { Table } from '../table/Table';
import { AccountUtils, isNumeric } from '../accounts/account-utils';
import { structuredClone } from '@/common/helpers';
import { Logger } from '@/common/logger';
import { removeFilterCriteria } from '../utils/spreadsheet';
import { FIRE_COLUMNS } from '@/common/constants';
import { FEATURES } from '@/common/features';

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
export function importCSV(
  inputTable: RawTable,
  bankAccount: string
): ServerResponse {
  try {
    Logger.time('importCSV')

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

    const result = processImportData(inputTable, accountConfig)

    if (result.isEmpty()) {
      const msg = 'No rows to import, check your import data or configuration!';
      Logger.log(msg)
      return {
        success: false,
        error: msg
      }
    }

    // actual importing of the data into the sheet
    Logger.time('FireSheet.importData')

    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    fireSheet.importData(result, autoFillColumns)

    Logger.timeEnd('FireSheet.importData')

    const msg = `imported ${result.getRowCount()} rows!`;
    Logger.log(msg)

    Logger.timeEnd('importCSV')

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

const getRowHash = (row: unknown[], compareIndices: number[]) => compareIndices.map(idx => {
  const cell = row[idx];
  return cell instanceof Date ? cell.toISOString() : String(cell ?? '');
}).join('|');

export function generatePreview(
  table: RawTable,
  bankAccount: string
): ServerResponse<{ result: RawTable; newBalance?: number; duplicateIndices?: number[] }> {
  try {
    const config = Config.getAccountConfiguration(bankAccount);

    if (!config) {
      throw new Error(`Configuration for account ${bankAccount} not found`);
    }

    // Process the data using the exact same logic as the actual import
    const fireTable = processImportData(table, config);

    // Calculate new balance based on the shaped data
    const amountNumbers = fireTable
      .getFireColumn('amount')
      .filter(isNumeric)
      .map(Number);

    const newBalance = AccountUtils.calculateNewBalance(bankAccount, amountNumbers);

    const compareCols: FireColumn[] = ['iban', 'amount', 'contra_account', 'description'];
    const headers = Array.from(FIRE_COLUMNS);
    const compareIndices = compareCols.map(col => headers.indexOf(col));
    const existingHashes = new Set<string>();

    if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
      // Detect duplicates against last imported batch
      const fireSheet = new FireSheet();
      const lastImportedTransactions = fireSheet.getLastImportedTransactions();

      for (const row of lastImportedTransactions.getData()) {
        existingHashes.add(getRowHash(row, compareIndices));
      }
    }

    const duplicateIndices: number[] = [];

    // Apply auto-filled visual indications
    const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : [];

    const result = fireTable.getData().map((row, index) => {
      if (existingHashes.has(getRowHash(row, compareIndices))) {
        duplicateIndices.push(index + 1); // 1-based index (header is 0)  
      }

      const newRow = [...row];
      for (const colIndex of autoFillColumns) {
        // AutoFill columns are 1-indexed, so we subtract 1 for array index
        const arrayIndex = colIndex - 1;
        if (arrayIndex >= 0 && arrayIndex < newRow.length) {
          if (!newRow[arrayIndex] || newRow[arrayIndex] === '') {
            newRow[arrayIndex] = '(auto-filled)';
          }
        }
      }
      // Format Date objects to strings for the frontend
      return newRow.map(cell => {
        if (cell instanceof Date) {
          try {
            // Use the active spreadsheet's timezone so dates are properly formatted
            const timeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
            return Utilities.formatDate(cell, timeZone, "yyyy-MM-dd");
          } catch {
            // Fallback if Utilities/SpreadsheetApp is not available in mock/testing
            return cell.toISOString().split('T')[0];
          }
        }
        return String(cell ?? '');
      });
    });

    // Prepend the header row to the result for the DataTable component
    result.unshift(headers);

    return {
      success: true,
      data: { result, newBalance, duplicateIndices }
    };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
