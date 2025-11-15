import type { Table } from '@/common/types';
import { getSourceSheet } from './globals';
import type { FireColumnRules } from './types';
import { FIRE_COLUMNS } from '@/common/constants';
import type { FireColumn } from '@/common/constants';
import { Logger } from '@/common/logger';
import { Config } from './config';
import { AccountUtils } from './account-utils';
import { Transformers } from './transformers';

const EMPTY = '';

/**
 * Uses the account configuration and the input data from the user
 * to generate import data structured in the way of the Firesheet
 * 
 * @param {Table} input the input data from the user in the CSV format of the bank
 * @param {Config} config the configuration for the account that is used to import the data
 * @returns {Table} the data structured in the way of the Firesheet
 */
export function processInputDataAndShapeFiresheetStructure({
  headers,
  rows,
  config,
}: {
  headers: string[];
  rows: Table;
  config: Config;
}): Table {
  let output: Table = [];
  const rowCount = rows.length;
  const cols = TableUtils.transpose(rows);

  function buildColumn<T>(
    fireColumn: FireColumn,
    transformer?: (value: string) => T
  ): T[] {
    const columnIndex = config.getColumnIndex(fireColumn, headers);
    if (typeof columnIndex === 'number' && cols[columnIndex] !== undefined) {
      return cols[columnIndex].map((val) =>
        transformer ? transformer(val) : (val as T)
      );
    } else {
      // if the column is not found in the input data, we return an array of empty strings
      // with the length of the rowCount to make sure the column still has an empty filled amount of rows
      return new Array(rowCount);
    }
  }

  // prettier-ignore
  const columnImportRules: FireColumnRules = {
    ref: null,
    iban: () => new Array(rowCount).fill(AccountUtils.getBankIban(config.getAccountId())),
    date: () => buildColumn('date', Transformers.transformDate),
    amount: () => buildColumn('amount', Transformers.transformMoney),
    category: () => buildColumn('category'),
    contra_account: () => buildColumn('contra_account'),
    label: () => buildColumn('label'),
    import_date: () => new Array(rowCount).fill(new Date()),
    description: () => buildColumn('description'),
    contra_iban: () => buildColumn('contra_iban'),
    currency: () => buildColumn('currency'),
  }

  for (const columnName of FIRE_COLUMNS) {
    const colRule = columnImportRules[columnName as keyof FireColumnRules];

    if (!colRule) {
      // if the column is not defined in the rules, we just add an empty column
      // this is import for the import to work correctly
      // otherwise we end up with a mismatch of columns
      output.push(new Array(rowCount));
      continue;
    }

    let column: any[];
    try {
      column = colRule();
      column = TableUtils.ensureLength(column, rowCount);
    } catch (e) {
      console.error(e);
      column = new Array(rowCount);
    }
    output.push(column);
  }
  output = TableUtils.transpose(output); // flip columns to rows
  return output;
}

export class TableUtils {
  /**
   * Imports data in structure of a table into the source sheet
   * @param {Table} data the data to be imported into the source sheet
   */
  static importData(data: Table) {
    const sourceSheet = getSourceSheet();
    const rowCount = data.length;

    if (!sourceSheet) {
      console.error('Error: The sourceSheet was not found. Cannot import data.');
      return;
    }

    if (rowCount === 0) {
      Logger.log('No data to import.');
      return;
    }

    const colCount = data[0].length;
    Logger.log(`importing data (rows: ${rowCount}, cols: ${colCount})`);

    try {
      if (typeof Sheets !== 'undefined' && Sheets.Spreadsheets) {
        Logger.time('importData (Sheets API)');
        const spreadsheetId = sourceSheet.getParent().getId();
        const sheetId = sourceSheet.getSheetId();

        const requests: GoogleAppsScript.Sheets.Schema.Request[] = [
          {
            insertDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: 1,
                endIndex: 1 + rowCount,
              },
              inheritFromBefore: false,
            },
          },
          {
            updateCells: {
              rows: data.map((row) => ({
                values: row.map(generateCellData),
              })),
              fields: 'userEnteredValue,userEnteredFormat',
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: 1 + rowCount,
                startColumnIndex: 0,
                endColumnIndex: colCount,
              },
            },
          },
        ];

        Sheets.Spreadsheets.batchUpdate({ requests }, spreadsheetId);
        Logger.timeEnd('importData (Sheets API)');
      } else {
        Logger.time('importData (Apps Script API) (slower)');
        Logger.log('Sheets API not available, using native insertion of rows (slower)');
        sourceSheet.insertRowsBefore(2, rowCount);
        sourceSheet.getRange(2, 1, rowCount, colCount).setValues(data);
        Logger.timeEnd('importData (Apps Script API) (slower)');
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  protected static handleError(error: unknown) {
    if (error instanceof Error) {
      console.error('Error: ', error.message);
    } else {
      console.error('Unknown error: ', error);
    }
  }

  /**
   * @see https://github.com/ramda/ramda/blob/v0.27.0/source/transpose.js
   */
  static transpose<T>(outerlist: T[][]): T[][] {
    let i = 0;
    let result: T[][] = [];
    while (i < outerlist.length) {
      let innerlist = outerlist[i];
      let j = 0;
      while (j < innerlist.length) {
        if (typeof result[j] === 'undefined') {
          result[j] = [];
        }
        result[j].push(innerlist[j]);
        j += 1;
      }
      i += 1;
    }
    return result;
  }

  static retrieveColumn(data: Table, columnIndex: number): string[] {
    return data?.map((row) => row?.[columnIndex] ?? EMPTY) ?? [];
  }

  static deleteFirstRow(data: Table): Table {
    data.shift();
    return data;
  }

  static removeEmptyRows(data: Table): Table {
    const filteredData = data.filter((row) => { // filter omits false values
      return row.some((cell) => cell !== EMPTY); // some returns true if at least one cell is not empty
    });
    return filteredData;
  }

  static deleteLastRow(data: Table): Table {
    data.pop();
    return data;
  }

  static sortByDate(data: Table, dateColumn: number) {
    return data.toSorted(
      (row1, row2) =>
        new Date(row1[dateColumn]).getTime() -
        new Date(row2[dateColumn]).getTime()
    ).reverse();
  }

  static deleteColumns(table: Table, colIndices: number[]): Table {
    // we want to have the indices sorted backwards to prevent shifting of elements
    // while traversing the array
    const sortedIndices = colIndices.sort().reverse();
    // tranpose the table so we are working with columns first instead of rows
    let transposedTable = this.transpose(table);
    // delIndex is the column index to delete in the table
    for (const delIndex of sortedIndices) {
      if (typeof transposedTable[delIndex] !== 'undefined') {
        transposedTable.splice(delIndex, 1);
      }
    }
    // transpose again back to rows first
    return this.transpose(transposedTable);
  }

  static autoFillColumns(data: Table, columns: number[]) {
    const sourceSheet = getSourceSheet()
    for (const column of columns) {
      const rowCount = data.length;
      const sourceRange = sourceSheet?.getRange(2 + rowCount, column);
      const destinationRange = sourceSheet?.getRange(2, column, rowCount + 1); // + 1 because sourceRange needs to be included
      if (destinationRange) {
        sourceRange?.autoFill(
          destinationRange,
          SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES
        );
      }
    }
  }

  static ensureLength<T>(arr: (T | null)[], length: number): (T | null)[] {
    if (arr.length < length) {
      return [
        ...arr,
        ...new Array(length - arr.length).fill(null),
      ];
    }
    return arr.slice(0, length);
  }

  static getFireColumnIndexByName(column: FireColumn): number {
    return FIRE_COLUMNS.findIndex((col) => col.toLowerCase() === column);
  }
}

function generateCellData(cell: unknown): GoogleAppsScript.Sheets.Schema.CellData {
  const extendedValue: GoogleAppsScript.Sheets.Schema.ExtendedValue = {};

  if (cell === null || typeof cell === 'undefined') {
    // no value
  } else if (cell instanceof Date) {
    // Convert JS date to Google Sheets serial number.
    // Sheets date epoch is 1899-12-30. JS epoch is 1970-01-01.
    // @see https://developers.google.com/workspace/sheets/api/reference/rest/v4/DateTimeRenderOption
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

  const cellData: GoogleAppsScript.Sheets.Schema.CellData = {
    userEnteredValue: extendedValue,
  };

  if (cell instanceof Date) {
    cellData.userEnteredFormat = {
      numberFormat: { type: 'DATE_TIME' },
    };
  }

  return cellData;
}

