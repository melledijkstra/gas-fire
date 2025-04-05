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
  config
}: {
  headers: string[]
  rows: Table
  config: Config
}): Table {
  let output: Table = [];
  const rowCount = rows.length;

  function buildColumn<T>(
    rows: Table,
    fireColumn: FireColumn,
    transformer?: (value: string) => T
  ): T[] {
    const columnIndex = config.getColumnIndex(fireColumn, headers);
    const cols = TableUtils.transpose(rows); // try to transpose somewhere else
    if (typeof columnIndex === 'number' && cols[columnIndex] !== undefined) {
      return cols[columnIndex].map((val) =>
        transformer ? transformer(val) : (val as T)
      );
    } else {
      return new Array(rowCount);
    }
  }

  // prettier-ignore
  const columnImportRules: FireColumnRules = {
    ref: null,
    iban: (data) => new Array(data.length).fill(AccountUtils.getBankIban(config.getAccountId())),
    date: (data) => buildColumn(data, 'date', Transformers.transformDate),
    amount: (data) => buildColumn(data, 'amount', Transformers.transformMoney),
    category: (data) => buildColumn(data, 'category'),
    contra_account: (data) => buildColumn(data, 'contra_account'),
    label: (data) => buildColumn(data, 'label'),
    import_date: (data) => new Array(data.length).fill(new Date()),
    description: (data) => buildColumn(data, 'description'),
    contra_iban: (data) => buildColumn(data, 'contra_iban'),
    currency: (data) => buildColumn(data, 'currency'),
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
      column = colRule(rows);
      column = TableUtils.ensureLength(column, rowCount);
    } catch (e) {
      Logger.log(e);
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
    const sourceSheet = getSourceSheet()
    const rowCount = data.length;
    const colCount = data[0].length;
    Logger.log(`importing data (rows: ${rowCount}, cols: ${colCount})`);
    sourceSheet
      ?.insertRowsBefore(2, rowCount)
      .getRange(2, 1, rowCount, colCount)
      .setValues(data as Table);
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
    return data.sort(
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
