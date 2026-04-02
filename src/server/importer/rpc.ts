import { Config } from '../config';
import { Table } from '@/common/table';
import { FireTable } from '../fire-table';
import { FireSheet } from '../fire-sheet';
import type { ServerResponse, TableData } from '@/common/types';
import { AccountUtils, isNumeric } from '../accounts/account-utils';
import { structuredClone } from '@/common/helpers';
import { Logger } from '@/common/logger';
import { activateSpreadsheet, removeFilterCriteria } from '../utils/spreadsheet';
import { FIRE_COLUMNS, type FireColumn } from '@/common/constants';
import { FEATURES } from '@/common/features';

/**
 * Processes raw input data into the structured Firesheet format,
 * applying filtering and sorting rules.
 *
 * @param {TableData} inputData - The raw input data
 * @param {Config} accountConfig - The configuration for the account
 * @returns {FireTable} The processed data, ready for import
 */
function processImportData(inputData: TableData, accountConfig: Config): FireTable {
  const clonedData = structuredClone(inputData);
  const inputTable = new Table(clonedData);

  // retrieve the header row and separate from the actual input data
  const headerRow = inputTable.getData().shift() as string[];

  if (!headerRow || headerRow.length === 0) {
    throw new Error('No header row detected in import data!')
  }

  //
  // BEFORE IMPORT RULES
  //
  inputTable.removeEmptyRows();

  //
  // IMPORT RULES
  //
  const resultTable = FireTable.fromInputData(
    headerRow,
    inputTable.getData(),
    accountConfig
  );
  // ^^ resultTable is now in the firesheet structure

  resultTable.sortByDate();

  return resultTable;
}

/**
 * This very function might be the core of this spreadsheet and project.
 * It handles incoming CSV (already parsed by the frontend) and processes it in order to be imported
 * into the spreadsheet.
 *
 * It uses configuration from the user to determine how the CSV should be processed.
 *
 * @param {TableData} inputTable - The table object which contains the CSV data
 * @param {string} bankAccount - The bank account identifier which is used to lookup configuration
 * @returns {ServerResponse} A response object which contains a message to be displayed to the user
 */
export function importCSV(
  inputTable: TableData,
  bankAccount: string
): ServerResponse {
  try {
    Logger.time('importCSV')

    const fireSheet = new FireSheet();
    const sourceSheet = fireSheet.getSheet();
    const accountConfig = Config.getAccountConfiguration(bankAccount)

    Logger.log('account configuration used for import', accountConfig)

    if (!accountConfig) {
      throw new Error(
        `Bank with identifier "${bankAccount}" does not have valid configuration!`
      )
    }

    if (!sourceSheet) {
        throw new Error('Source sheet not found!');
    }

    // make the user visually switch to the primary sheet where data will be imported
    activateSpreadsheet(sourceSheet)

    // remove any filters that might be set
    // importing might go wrong when filters are set
    const filter = sourceSheet?.getFilter()

    if (filter) {
      if (!removeFilterCriteria(filter, true)) {
        throw new Error(
          'Filters need to be removed before importing, cancelling import'
        );
      }
    }

    const result = processImportData(inputTable, accountConfig)

    if (result.length === 0) {
      const msg = 'No rows to import, check your import data or configuration!';
      Logger.log(msg)
      return {
        success: false,
        error: msg
      }
    }

    // actual importing of the data into the sheet
    Logger.time('FireSheet.importData')

    const autoFillColumns = accountConfig.autoFillEnabled 
      ? accountConfig.autoFillColumnIndices.map(idx => FIRE_COLUMNS[idx - 1]) 
      : undefined;
      
    fireSheet.importData(result, autoFillColumns as FireColumn[])

    Logger.timeEnd('FireSheet.importData')

    const msg = `imported ${result.length} rows!`;
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
  table: TableData,
  bankAccount: string
): ServerResponse<{ result: TableData; newBalance?: number; duplicateIndices?: number[] }> {
  try {
    const config = Config.getAccountConfiguration(bankAccount);

    if (!config) {
      throw new Error(`Configuration for account ${bankAccount} not found`);
    }

    // Process the data using the exact same logic as the actual import
    const processedData = processImportData(table, config);

    // Calculate new balance based on the shaped data
    const amountColumnIndex = processedData.getColumnIndex('amount');
    let amountNumbers: number[] = [];

    if (processedData.length > 0) {
      const amounts = processedData.retrieveColumn(amountColumnIndex);
      // The amount is already transformed to a number in processImportData
      amountNumbers = amounts.filter(isNumeric).map(Number);
    }

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

    const result = processedData.getData().map((row, index) => {
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
