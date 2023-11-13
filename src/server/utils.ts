import { Table, InputColumn } from './types';

export const SOURCE_SHEET_ID = 1093484485;

const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
const sheets = FireSpreadsheet.getSheets();

export function getSheetById(
  id: number
): GoogleAppsScript.Spreadsheet.Sheet | undefined {
  return sheets.find((sheet) => sheet.getSheetId() === id);
}

export const sourceSheet = getSheetById(SOURCE_SHEET_ID);

export class Utils {
  /**
   * @see https://github.com/ramda/ramda/blob/v0.27.0/source/transpose.js
   */
  static transpose<T>(outerlist: T[][]): T[][] {
    let i = 0;
    let result = [];
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

  static importData(data: Table) {
    const rowCount = data.length;
    const colCount = data[0].length;
    Logger.log(`importing data (rows: ${rowCount}, cols: ${colCount})`);
    sourceSheet
      ?.insertRowsBefore(2, rowCount)
      .getRange(2, 1, rowCount, colCount)
      .setValues(data as Table);
  }

  static autoFillColumns(data: Table, columns: number[]) {
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

  static ensureLength(arr: any[], length: number) {
    if (arr.length < length) {
      arr = arr.fill(null, arr.length, length - 1);
    }
    return arr;
  }

  static deleteFirstRow(data: Table): Table {
    data.shift();
    return data;
  }

  static deleteLastRow(data: Table): Table {
    data.pop();
    return data;
  }

  static deleteColumns(table: Table, colIndices: number[]): Table {
    // we want to have the indices sorted backwards to prevent shifting of elements
    // while traversing the array
    const sortedIndices = colIndices.sort().reverse();
    // tranpose the table so we are working with columns first instead of rows
    let transposedTable = this.transpose(table);
    Logger.log('transposed');
    Logger.log(transposedTable);
    // delIndex is the column index to delete in the table
    for (const delIndex of sortedIndices) {
      if (typeof transposedTable[delIndex] !== 'undefined') {
        transposedTable.splice(delIndex, 1);
      }
    }
    // transpose again back to rows first
    return this.transpose(transposedTable);
  }

  static sortByDate(dateColumn: InputColumn) {
    return (data: Table) => {
      data
        .sort(
          (row1, row2) =>
            new Date(row1[dateColumn]).getUTCDate() -
            new Date(row2[dateColumn]).getUTCDate()
        )
        .reverse();
      return data;
    };
  }

  static getBankAccounts(): Record<string, string> {
    // this range contains the ibans only
    const ibans = FireSpreadsheet.getRangeByName('accounts');
    // we also need to include the labels
    const accounts = ibans
      ?.offset(0, -1, ibans.getLastRow(), 2)
      .getValues()
      // make sure not to include empty rows
      .filter((row) => row.some((cell) => cell !== '' && cell !== null));

    if (!accounts?.length) {
      return {}; // return empty list of bank accounts if none setup
    }

    // convert the list to an object to easy work with it
    return accounts.reduce((obj, account) => {
      const [id, iban] = account;
      obj[id.toUpperCase()] = iban;
      return obj;
    }, {});
  }

  static getBankIban(bank: string): string {
    const bankAccounts = Utils.getBankAccounts();
    return bankAccounts?.[bank] ?? '';
  }
}
