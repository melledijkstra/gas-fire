import type { ServerResponse, RawTable, ImportPreviewReport, UserDecisions, PreviewTransaction, TransactionAction, TransactionStatus } from '@/common/types';
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
import { getRowHash } from '../duplicate-finder';

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
  bankAccount: string,
  userDecisions?: UserDecisions
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

    const fireTable = processImportData(inputTable, accountConfig);

    if (fireTable.isEmpty()) {
      const msg = 'No rows to import, check your import data or configuration!';
      Logger.log(msg);
      return { success: false, error: msg };
    }

    let finalTable = fireTable;

    // Apply duplicate detection and user decisions if userDecisions are provided
    // or if the feature is enabled (in direct import without userDecisions)
    const compareCols: FireColumn[] = ['date', 'iban', 'amount', 'contra_account', 'description'];
    const headers = Array.from(FIRE_COLUMNS);
    const compareIndices = compareCols.map(col => headers.indexOf(col));
    const existingHashes = new Set<string>();

    if (FEATURES.IMPORT_DUPLICATE_DETECTION || userDecisions) {
      if (FEATURES.IMPORT_DUPLICATE_DETECTION) {
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
      }

      // Filter rows based on duplicates and user decisions
      const validRows = fireTable.getData().filter(row => {
        const hash = getRowHash(row, compareIndices);

        let action: TransactionAction = 'import';
        const status: TransactionStatus = existingHashes.has(hash) ? 'duplicate' : 'valid';

        if (userDecisions && userDecisions[hash]) {
           action = userDecisions[hash];
        } else if (status === 'duplicate') {
           // Default if no explicit user decision
           action = 'import';
        }

        return action === 'import';
      });

      finalTable = new FireTable(validRows);
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

    const compareCols: FireColumn[] = ['iban', 'amount', 'contra_account', 'description'];
    const headers = Array.from(FIRE_COLUMNS);
    const compareIndices = compareCols.map(col => headers.indexOf(col));
    const existingHashes = new Set<string>();

    // We always detect duplicates in preview, even if feature is toggled off for general import
    // so that the user gets transparency and control.
    try {
      const fireSheet = new FireSheet();
      const lastImportedTransactions = fireSheet.getLastImportedTransactions();
      if (lastImportedTransactions) {
        for (const row of lastImportedTransactions.getData()) {
          existingHashes.add(getRowHash(row, compareIndices));
        }
      }
    } catch (e) {
      Logger.warn('Could not retrieve last imported transactions for duplicate detection', e);
    }

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

    const transactions: PreviewTransaction[] = fireTable.getData().map((row) => {
      const hash = getRowHash(row, compareIndices);
      let status: TransactionStatus;
      const action: TransactionAction = 'import';

      if (existingHashes.has(hash)) {
        status = 'duplicate';
        summary.duplicateCount++;
      } else {
        status = 'valid';
        summary.validCount++;
        // we extract the number before formatting the row visually
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

      const stringRow = formattedRow.map(cell => {
        if (cell instanceof Date) {
          try {
            const timeZone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
            return Utilities.formatDate(cell, timeZone, "yyyy-MM-dd");
          } catch {
            return cell.toISOString().split('T')[0];
          }
        }
        return String(cell ?? '');
      });

      return {
        hash,
        row: stringRow,
        status,
        action
      };
    });

    const newBalance = AccountUtils.calculateNewBalance(bankAccount, validAmountNumbers);

    return {
      success: true,
      data: {
        headers,
        transactions,
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
