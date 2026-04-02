import { getSourceSheet } from './globals';
import { Logger } from '@/common/logger';
import { SheetsRequestBuilder } from './request-builder';
import type { Table } from '@/common/table';
import { FireTable } from './fire-table';
import type { FireColumn } from '@/common/constants';

export class FireSheet {
  private sourceSheet: GoogleAppsScript.Spreadsheet.Sheet | null;

  constructor() {
    this.sourceSheet = getSourceSheet() ?? null;
  }

  public getSheet(): GoogleAppsScript.Spreadsheet.Sheet | null {
    return this.sourceSheet;
  }

  /**
   * Imports data in structure of a table into the source sheet
   * @param {Table | FireTable} table the data to be imported into the source sheet
   * @param {FireColumn[]} autoFillColumns optional column names to autofill
   */
  public importData(table: Table | FireTable, autoFillColumns?: FireColumn[]) {
    if (!this.sourceSheet) {
      Logger.error('Error: The sourceSheet was not found. Cannot import data.');
      return;
    }

    const data = table.getData();
    const rowCount = data.length;

    if (rowCount === 0) {
      Logger.log('No data to import.');
      return;
    }

    const colCount = data[0].length;
    Logger.log(`importing data (rows: ${rowCount}, cols: ${colCount})`);

    let autoFillIndices: number[] = [];
    if (autoFillColumns && table instanceof FireTable) {
      autoFillIndices = autoFillColumns.map(col => table.getColumnIndex(col) + 1); // 1-indexed for Sheets
    }

    try {
      if (typeof Sheets !== 'undefined' && Sheets.Spreadsheets) {
        const requestBuilder = new SheetsRequestBuilder();
        const spreadsheetId = this.sourceSheet.getParent().getId();
        const sheetId = this.sourceSheet.getSheetId();

        Logger.time('importData (Sheets API)');

        requestBuilder
          .insertRows(sheetId, 1, rowCount)
          .insertData(sheetId, data, 1, 0, this.generateCellData);

        if (autoFillIndices.length > 0) {
          for (const column of autoFillIndices) {
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

        Sheets.Spreadsheets.batchUpdate({ requests: requestBuilder.requests }, spreadsheetId);
        Logger.timeEnd('importData (Sheets API)');
      } else {
        Logger.time('importData (Apps Script API) (slower)');
        Logger.warn('Sheets API not available, using native insertion of rows (slower)');
        this.sourceSheet.insertRowsBefore(2, rowCount);
        this.sourceSheet.getRange(2, 1, rowCount, colCount).setValues(data as any[][]);

        Logger.time('autoFillColumns (Apps Script API) (slower)');
        if (autoFillIndices.length > 0) {
          for (const column of autoFillIndices) {
            const sourceRange = this.sourceSheet.getRange(2 + rowCount, column);
            const destinationRange = this.sourceSheet.getRange(2, column, rowCount + 1);
            if (destinationRange) {
              sourceRange.autoFill(
                destinationRange,
                SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES
              );
            }
          }
        }
        Logger.timeEnd('autoFillColumns (Apps Script API) (slower)');

        Logger.timeEnd('importData (Apps Script API) (slower)');
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: unknown) {
    if (error instanceof Error) {
      Logger.error('Error: ', error.message);
    } else {
      Logger.error('Unknown error: ', error);
    }
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
    } else if (typeof cell === 'boolean') {
      extendedValue.boolValue = cell;
    } else {
      extendedValue.stringValue = String(cell);
    }

    return { userEnteredValue: extendedValue };
  }

  public getLastImportedTransactions(): FireTable {
    if (!this.sourceSheet) return new FireTable([]);

    const lastRow = this.sourceSheet.getLastRow();
    if (lastRow <= 1) return new FireTable([]);
    
    const values = this.sourceSheet.getRange(1, 1, Math.min(lastRow, 500), this.sourceSheet.getLastColumn()).getValues();

    if (values.length <= 1) return new FireTable([]);

    const table = new FireTable(values);
    const importDateCol = table.getColumnIndex('import_date');
    const lastImportDate = table.getLastImportDate();

    if (!lastImportDate) return new FireTable([]);

    const lastImportedRows: any[][] = [];

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowDateRaw = row[importDateCol];

      let rowDateTime = -1;

      if (rowDateRaw instanceof Date) {
        rowDateTime = rowDateRaw.getTime();
      } else if (rowDateRaw !== undefined && rowDateRaw !== null && rowDateRaw !== '') {
        rowDateTime = new Date(String(rowDateRaw)).getTime();
      }

      if (rowDateTime === lastImportDate.getTime()) {
        lastImportedRows.push(row);
      } else {
        break;
      }
    }

    return new FireTable(lastImportedRows);
  }
}
