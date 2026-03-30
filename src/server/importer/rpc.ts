import { getSourceSheet } from '../globals';
import { Config } from '../config';
import { TableUtils, processInputDataAndShapeFiresheetStructure } from '../table-utils';
import type { ServerResponse, Table } from '@/common/types';
import { AccountUtils, isNumeric } from '../accounts/account-utils';
import { structuredClone } from '../helpers';
import { Logger } from '@/common/logger';
import { activateSpreadsheet, removeFilterCriteria } from '../utils/spreadsheet';
import { FIRE_COLUMNS } from '@/common/constants';

/**
 * Processes raw input data into the structured Firesheet format,
 * applying filtering and sorting rules.
 *
 * @param {Table} inputTable - The raw input data
 * @param {Config} accountConfig - The configuration for the account
 * @returns {Table} The processed data, ready for import
 */
function processImportData(inputTable: Table, accountConfig: Config): Table {
  let result = structuredClone(inputTable)

  // retrieve the header row and separate from the actual input data
  const headerRow = result.shift() // cast because we know first header row exists

  if (!headerRow || headerRow.length === 0) {
    throw new Error('No header row detected in import data!')
  }

  //
  // BEFORE IMPORT RULES
  //
  result = TableUtils.removeEmptyRows(result)

  //
  // IMPORT RULES
  //
  result = processInputDataAndShapeFiresheetStructure({
    headers: headerRow,
    rows: result,
    config: accountConfig,
  })
  // ^^ result is now in the firesheet structure

  const dateColumn = TableUtils.getFireColumnIndexByName('date')
  if (dateColumn !== -1) {
    // if we found a date column, we sort the data by date
    result = TableUtils.sortByDate(result, dateColumn)
  }

  return result
}

/**
 * This very function might be the core of this spreadsheet and project.
 * It handles incoming CSV (already parsed by the frontend) and processes it in order to be imported
 * into the spreadsheet.
 *
 * It uses configuration from the user to determine how the CSV should be processed.
 *
 * @param {Table} inputTable - The table object which contains the CSV data
 * @param {string} bankAccount - The bank account identifier which is used to lookup configuration
 * @returns {ServerResponse} A response object which contains a message to be displayed to the user
 */
export function importCSV(
  inputTable: Table,
  bankAccount: string
): ServerResponse {
  try {
    Logger.time('importCSV')

    const sourceSheet = getSourceSheet()
    const accountConfig = Config.getAccountConfiguration(bankAccount)

    Logger.log('account configuration used for import', accountConfig)

    if (!accountConfig) {
      throw new Error(
        `Bank with identifier "${bankAccount}" does not have valid configuration!`
      )
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
        message: msg,
        error: msg
      }
    }

    // actual importing of the data into the sheet
    Logger.time('TableUtils.importData')

    const autoFillColumns = accountConfig.autoFillEnabled ? accountConfig.autoFillColumnIndices : undefined
    TableUtils.importData(result, autoFillColumns)

    Logger.timeEnd('TableUtils.importData')

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

export function generatePreview(
  table: Table,
  bankAccount: string
): ServerResponse<{ result: Table; newBalance?: number }> {
  try {
    const config = Config.getAccountConfiguration(bankAccount);

    if (!config) {
      throw new Error(`Configuration for account ${bankAccount} not found`);
    }

    // Process the data using the exact same logic as the actual import
    const processedData = processImportData(table, config);

    // Calculate new balance based on the shaped data
    const amountColumnIndex = TableUtils.getFireColumnIndexByName('amount');
    let amountNumbers: number[] = [];

    if (amountColumnIndex !== -1 && processedData.length > 0) {
      const amounts = processedData.map((row) => row[amountColumnIndex]);
      // The amount is already transformed to a number in processImportData
      amountNumbers = amounts
        .map(val => Number(val))
        .filter(isNumeric);
    }

    const newBalance = AccountUtils.calculateNewBalance(bankAccount, amountNumbers);

    // Apply auto-filled visual indications
    const autoFillColumns = config.autoFillEnabled ? config.autoFillColumnIndices : [];

    const result = processedData.map(row => {
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

    // Generate headers for the preview
    const headers = FIRE_COLUMNS.map((col, index) => {
      // AutoFill columns are 1-indexed
      if (autoFillColumns.includes(index + 1)) {
        return `${col} (auto-filled)`;
      }
      return col;
    });

    // Prepend the header row to the result for the DataTable component
    result.unshift(headers as string[]);

    return {
      success: true,
      data: { result, newBalance }
    };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
