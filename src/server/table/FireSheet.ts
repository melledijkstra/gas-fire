import type { CellValue } from './types';
import { FireTable } from './FireTable';
import { SheetsRequestBuilder } from '../request-builder';
import { Logger } from '@/common/logger';
import { getSourceSheet } from '../globals';
import { columnToLetter } from '../utils/spreadsheet';

const MS_IN_DAY = 86400000;
const DAYS_FROM_JS_EPOCH_TO_SHEETS_EPOCH = 25569;
const MINUTES_IN_DAY = 1440;

type GetLastImportedTransactionsOptions = {
  stopOnDifferentImportDate?: boolean;
}

/**
 * Represents the FIRE source sheet in Google Sheets.
 *
 * Wraps a `GoogleAppsScript.Spreadsheet.Sheet` and provides operations
 * specific to the source sheet's structure, such as importing data,
 * reading data as a FireTable, and managing filters.
 *
 * @example
 * ```ts
 * const sheet = new FireSheet();
 * const fireTable = sheet.getData();
 *
 * sheet.importData(processedTable, [1, 5, 9]);
 * ```
 */
export class FireSheet {
  protected readonly _sheet: GoogleAppsScript.Spreadsheet.Sheet;
  protected static timeZoneCache: string | null = null;

  constructor() {
    const sourceSheet = getSourceSheet();
    if (!sourceSheet) {
      throw new Error(
        'Error: The source sheet was not found. Cannot operate on FireSheet.',
      );
    }
    this._sheet = sourceSheet;
  }

  // ──────────────────────────────────────────────
  // Accessors
  // ──────────────────────────────────────────────

  get sheet(): GoogleAppsScript.Spreadsheet.Sheet {
    return this._sheet;
  }

  getSheetId(): number {
    return this._sheet.getSheetId();
  }

  getSpreadsheetId(): string {
    return this._sheet.getParent().getId();
  }

  // ──────────────────────────────────────────────
  // Read operations
  // ──────────────────────────────────────────────

  /**
   * Reads all data from the source sheet and returns it as a FireTable.
   * The header row (row 1) is excluded from the data.
   * Careful with large sheets, as this reads all data into memory. Use `getRawData()` for more control.
   */
  getData(): FireTable {
    const allValues = this._sheet.getDataRange().getValues();
    // first row is headers, omit it — FireTable knows its columns via FIRE_COLUMNS
    const data = allValues.slice(1) as CellValue[][];
    return new FireTable(data);
  }

  /**
   * Reads all data from the source sheet including the header row.
   * Useful when callers need the raw sheet data as-is.
   */
  getRawData(): CellValue[][] {
    return this._sheet.getDataRange().getValues() as CellValue[][];
  }

  // ──────────────────────────────────────────────
  // Write operations
  // ──────────────────────────────────────────────

  /**
   * Imports a FireTable into the source sheet by inserting rows below the header.
   *
   * Uses the Sheets API for batch operations when available, falling back
   * to the Apps Script API for compatibility.
   *
   * @param fireTable - The data to import
   * @param autoFillColumns - Optional 1-based column indices to autofill after import
   */
  importData(fireTable: FireTable, autoFillColumns?: number[]): void {
    if (fireTable.isEmpty()) {
      throw new Error('No data to import.');
    }

    Logger.log(`importing data (rows: ${fireTable.getRowCount()}, cols: ${fireTable.getColumnCount()})`);

    try {
      if (typeof Sheets !== 'undefined' && Sheets.Spreadsheets) {
        // preferably use the Sheets API for better performance in general
        this.importWithSheetsAPI(fireTable, autoFillColumns);
      } else {
        this.importWithAppsScriptAPI(fireTable, autoFillColumns);
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // ──────────────────────────────────────────────
  // Sheet operations
  // ──────────────────────────────────────────────

  /**
   * Activates and shows the source sheet so the user can see it.
   */
  activate(): this {
    this._sheet.activate();
    this._sheet.showSheet();
    return this;
  }

  /**
   * Returns the filter on the source sheet, or null if no filter is set.
   */
  getFilter(): GoogleAppsScript.Spreadsheet.Filter | null {
    return this._sheet.getFilter();
  }

  /**
   * Sets values on a specific range in the sheet.
   * @param row - 1-based starting row
   * @param column - 1-based starting column
   * @param numRows - number of rows
   * @param numColumns - number of columns
   * @param values - the values to set
   */
  setValues(
    row: number,
    column: number,
    numRows: number,
    numColumns: number,
    values: CellValue[][],
  ): void {
    this._sheet
      .getRange(row, column, numRows, numColumns)
      .setValues(values);
  }

  // ──────────────────────────────────────────────
  // Read: last import batch
  // ──────────────────────────────────────────────

  /**
   * Reads the source sheet and returns all rows from the most recent import batch.
   *
   * The sheet is expected to be sorted by date descending, so the most recent
   * import date is at the top. Stops reading once a different import date is found.
   *
   * @returns A FireTable containing only the rows from the last import, or an empty FireTable.
   */
  getLastImportedTransactions({
    stopOnDifferentImportDate = true,
  }: GetLastImportedTransactionsOptions = {}): FireTable {
    const lastRow = this._sheet.getLastRow();
    if (lastRow <= 1) return new FireTable([]);

    // Only read up to 500 rows since data is sorted newest-first
    const values = this._sheet
      .getRange(1, 1, Math.min(lastRow, 500), this._sheet.getLastColumn())
      .getValues() as CellValue[][];

    if (values.length <= 1) return new FireTable([]);

    const lastImportDate = this.getLastImportDate(values);

    const importDateCol = FireTable.getFireColumnIndex('import_date');
    const lastImportedRows: CellValue[][] = [];

    // Iterate from row 2 (index 1) onwards, skipping the header
    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const rowDateRaw = row[importDateCol];

      let rowDateTime = -1;

      if (rowDateRaw instanceof Date) {
        rowDateTime = rowDateRaw.getTime();
      } else if (
        rowDateRaw !== undefined &&
        rowDateRaw !== null &&
        rowDateRaw !== ''
      ) {
        rowDateTime = new Date(String(rowDateRaw)).getTime();
      }

      if (
        stopOnDifferentImportDate &&
        rowDateTime !== lastImportDate?.getTime()
      ) {
        // stop reading further once we encounter a different import date, since data is sorted newest-first
        break;
      }

      lastImportedRows.push(row);
    }

    return new FireTable(lastImportedRows);
  }

  private handleError(error: unknown): void {
    const message = error instanceof Error
      ? `Error: ${error.message}`
      : `Unknown Error: ${String(error)}`;

    Logger.error(message);
  }

  /**
   * Returns the most recent import date found in sheet data.
   * Looks at row index 1 (first data row after header) since data is sorted newest-first.
   */
  private getLastImportDate(data: CellValue[][]): Date | null {
    const importDateCol = FireTable.getFireColumnIndex('import_date');
    if (importDateCol === -1) return null;
    if (data.length < 2) return null;

    const lastImportDateRaw = data[1][importDateCol];
    if (
      lastImportDateRaw === undefined ||
      lastImportDateRaw === null ||
      lastImportDateRaw === ''
    ) {
      return null;
    }

    const lastImportDateTime =
      lastImportDateRaw instanceof Date
        ? lastImportDateRaw.getTime()
        : new Date(String(lastImportDateRaw)).getTime();

    if (Number.isNaN(lastImportDateTime)) return null;

    return new Date(lastImportDateTime);
  }

  // ──────────────────────────────────────────────
  // Private import strategies
  // ──────────────────────────────────────────────

  private importWithSheetsAPI(
    fireTable: FireTable,
    autoFillColumns?: number[],
  ): void {
    const data = fireTable.getData();
    const rowCount = fireTable.getRowCount();
    const colCount = fireTable.getColumnCount();
    const requestBuilder = new SheetsRequestBuilder();
    const spreadsheetId = this.getSpreadsheetId();
    const sheetId = this.getSheetId();

    Logger.time('importData (Sheets API)');

    requestBuilder
      .insertRows(sheetId, 1, rowCount)
      .insertData(sheetId, data, 1, 0, generateCellData);

    if (autoFillColumns && autoFillColumns.length > 0) {
      for (const column of autoFillColumns) {
        if (column < 1 || column > colCount) {
          Logger.warn(
            `Invalid autoFill column index: ${column}. Skipping autoFill for this column.`,
          );
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
          'ROWS',
        );
      }
    }

    Sheets.Spreadsheets!.batchUpdate(
      { requests: requestBuilder.requests },
      spreadsheetId,
    );
    Logger.timeEnd('importData (Sheets API)');
  }

  private importWithAppsScriptAPI(
    fireTable: FireTable,
    autoFillColumns?: number[],
  ): void {
    const data = fireTable.getData();
    const rowCount = fireTable.getRowCount();
    const colCount = fireTable.getColumnCount();

    Logger.time('importData (Apps Script API) (slower)');
    Logger.warn(
      'Sheets API not available, using native insertion of rows (slower)',
    );

    this._sheet.insertRowsBefore(2, rowCount);
    this._sheet.getRange(2, 1, rowCount, colCount).setValues(data);

    Logger.time('autoFillColumns (Apps Script API) (slower)');
    if (autoFillColumns && autoFillColumns.length > 0) {
      const sourceA1s: string[] = [];
      const destA1s: string[] = [];

      for (const column of autoFillColumns) {
        const letter = columnToLetter(column);
        sourceA1s.push(`${letter}${2 + rowCount}`);
        destA1s.push(`${letter}2:${letter}${2 + rowCount}`);
      }

      const sourceRanges = this._sheet.getRangeList(sourceA1s).getRanges();
      const destRanges = this._sheet.getRangeList(destA1s).getRanges();

      for (let i = 0; i < autoFillColumns.length; i++) {
        const sourceRange = sourceRanges[i];
        const destinationRange = destRanges[i];
        if (sourceRange && destinationRange) {
          sourceRange.autoFill(
            destinationRange,
            SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES,
          );
        }
      }
    }
    Logger.timeEnd('autoFillColumns (Apps Script API) (slower)');
    Logger.timeEnd('importData (Apps Script API) (slower)');
  }

  /**
   * @see https://developers.google.com/apps-script/reference/spreadsheet/spreadsheet#getSpreadsheetTimeZone()
   */
  static getTimeZone(): string {
    if (this.timeZoneCache) {
      return this.timeZoneCache;
    }

    this.timeZoneCache = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();

    return this.timeZoneCache;
  }
}

// ──────────────────────────────────────────────
// Helper: convert CellValue → Sheets API CellData
// ──────────────────────────────────────────────

export function generateCellData(
  cell: unknown,
): GoogleAppsScript.Sheets.Schema.CellData {
  const extendedValue: GoogleAppsScript.Sheets.Schema.ExtendedValue = {};

  if (cell === null || typeof cell === 'undefined') {
    // no value
  } else if (cell instanceof Date) {
    extendedValue.numberValue =
      cell.getTime() / MS_IN_DAY +
      DAYS_FROM_JS_EPOCH_TO_SHEETS_EPOCH -
      cell.getTimezoneOffset() / MINUTES_IN_DAY;
  } else if (typeof cell === 'number') {
    extendedValue.numberValue = cell;
  } else {
    extendedValue.stringValue = String(cell);
  }

  return { userEnteredValue: extendedValue };
}
