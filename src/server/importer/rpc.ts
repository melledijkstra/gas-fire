import { getSourceSheet } from '../globals';
import { Config } from '../config';
import { TableUtils, processInputDataAndShapeFiresheetStructure } from '../table-utils';
import type { ServerResponse, Table } from '@/common/types';
import { AccountUtils, isNumeric } from '../accounts/account-utils';
import { Transformers } from '../transformers';
import { structuredClone } from '../helpers';
import { Logger } from '@/common/logger';
import { activateSpreadsheet, removeFilterCriteria } from '../utils/spreadsheet';

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

    let result = structuredClone(inputTable)

    // retrieve the header row and separate from the actual input data
    const headerRow = result.shift() // cast because we know first header row exists

    if (!headerRow || headerRow.length === 0) {
      const msg = 'No header row detected in import data!'
      Logger.log(msg)
      return { success: false, message: msg, error: msg }
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
    if (dateColumn) {
      // if we found a date column, we sort the data by date
      result = TableUtils.sortByDate(result, dateColumn)
    }

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
    let amounts: Array<string> = [];

    // PENDING: retrieve the amounts from CSV using the back account configuration
    const config = Config.getAccountConfiguration(bankAccount);

    if (!config) {
      throw new Error(`Configuration for account ${bankAccount} not found`);
    }

    const balanceColumnName = config?.getImportColumnNameByFireColumn('amount');

    if (balanceColumnName && table.length > 0) {
      const balanceColumnIndex = table[0].indexOf(balanceColumnName);
      if (balanceColumnIndex !== -1) {
        amounts = table.slice(1).map((row) => row[balanceColumnIndex]);
      }
    }

    const amountNumbers = amounts
      .map((value) => Transformers.transformMoney(value))
      .filter(isNumeric);

    const newBalance = AccountUtils.calculateNewBalance(bankAccount, amountNumbers);

    return {
      success: true,
      data: { result: table, newBalance }
    };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }
  }
}
