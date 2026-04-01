import { Logger } from '@/common/logger';
import { FireTable } from './FireTable';
import { SheetsRequestBuilder } from '../request-builder';

/**
 * A class that can do specific operations on the Google Sheet itself
 * with the knowledge of the specific structure of the fire sheet.
 */
export class FireSheet {
  constructor(private sheet: GoogleAppsScript.Spreadsheet.Sheet) {}

  /**
   * Imports data from a FireTable into the sheet.
   */
  importData(table: FireTable, autoFillColumns?: number[]) {
    const data = table.getData();
    const rowCount = data.length;

    if (rowCount === 0) {
      Logger.log('No data to import.');
      return;
    }

    const colCount = data[0].length;
    Logger.log(`importing data (rows: ${rowCount}, cols: ${colCount})`);

    try {
      if (typeof Sheets !== 'undefined' && Sheets.Spreadsheets) {
        this.importWithSheetsApi(data, autoFillColumns);
      } else {
        this.importWithAppsScriptApi(data, autoFillColumns);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private importWithSheetsApi(data: unknown[][], autoFillColumns?: number[]) {
    const rowCount = data.length;
    const colCount = data[0].length;
    const requestBuilder = new SheetsRequestBuilder();
    const spreadsheetId = this.sheet.getParent().getId();
    const sheetId = this.sheet.getSheetId();

    Logger.time('importData (Sheets API)');

    requestBuilder
      .insertRows(sheetId, 1, rowCount)
      .insertData(sheetId, data, 1, 0, this.generateCellData);

    if (autoFillColumns && autoFillColumns.length > 0) {
      for (const column of autoFillColumns) {
        if (column < 1 || column > colCount) {
          Logger.warn(`Invalid autoFill column index: ${column}. Skipping autoFill for this column.`);
          continue;
        }

        requestBuilder.autoFill(
          {
            sheetId,
            startRowIndex: 1 + rowCount,
            endRowIndex: 1 + rowCount + 1,
            startColumnIndex: column - 1,
            endColumnIndex: column,
          },
          -rowCount,
          "ROWS"
        );
      }
    }

    Sheets.Spreadsheets!.batchUpdate({ requests: requestBuilder.requests }, spreadsheetId);
    Logger.timeEnd('importData (Sheets API)');
  }

  private importWithAppsScriptApi(data: unknown[][], autoFillColumns?: number[]) {
    const rowCount = data.length;
    const colCount = data[0].length;

    Logger.time('importData (Apps Script API) (slower)');
    Logger.warn('Sheets API not available, using native insertion of rows (slower)');
    this.sheet.insertRowsBefore(2, rowCount);
    
    // We need to convert values to something Apps Script understands (Date objects are fine, but others might need conversion)
    const values = data.map(row => row.map(cell => {
        if (cell === null || cell === undefined) return '';
        return cell as (string | number | Date);
    }));
    
    this.sheet.getRange(2, 1, rowCount, colCount).setValues(values);

    if (autoFillColumns && autoFillColumns.length > 0) {
      for (const column of autoFillColumns) {
        const sourceRange = this.sheet.getRange(2 + rowCount, column);
        const destinationRange = this.sheet.getRange(2, column, rowCount + 1);
        if (destinationRange) {
          sourceRange.autoFill(
            destinationRange,
            SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES
          );
        }
      }
    }
    Logger.timeEnd('importData (Apps Script API) (slower)');
  }

  private generateCellData(cell: unknown): GoogleAppsScript.Sheets.Schema.CellData {
    const extendedValue: GoogleAppsScript.Sheets.Schema.ExtendedValue = {};

    if (cell === null || typeof cell === 'undefined') {
      // no value
    } else if (cell instanceof Date) {
      const MS_IN_DAY = 86400000;
      const DAYS_FROM_JS_EPOCH_TO_SHEETS_EPOCH = 25569;
      const MINUTES_IN_DAY = 1440;
      extendedValue.numberValue =
        cell.getTime() / MS_IN_DAY + DAYS_FROM_JS_EPOCH_TO_SHEETS_EPOCH - cell.getTimezoneOffset() / MINUTES_IN_DAY;
    } else if (typeof cell === 'number') {
      extendedValue.numberValue = cell;
    } else {
      extendedValue.stringValue = String(cell);
    }

    return {
      userEnteredValue: extendedValue,
    };
  }

  private handleError(error: unknown) {
    if (error instanceof Error) {
      Logger.error('Error in FireSheet: ', error.message);
    } else {
      Logger.error('Unknown error in FireSheet: ', error);
    }
  }
}
