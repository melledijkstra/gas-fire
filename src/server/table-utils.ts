import type { Table } from '@/common/types';
import { sourceSheet } from './globals';
import type { FireColumnRules } from './types';
import { FIRE_COLUMNS } from '@/common/constants';
import type { FireColumn } from '@/common/constants';
import { Logger } from '@/common/logger';
import { Config } from './config';

const EMPTY = '';

export function buildColumn<T>(
  column: FireColumn,
  config: Config,
  transformer?: (value: string) => T
): (data: Table) => T[] {
  return (data: Table): T[] => {
    const columnIndex = config.getColumnIndex(column, data);
    const rowCount = data.length;
    const columnTable = TableUtils.transpose(data); // try to transpose somewhere else
    if (columnIndex && columnTable[columnIndex] !== undefined) {
      return columnTable[columnIndex].map((val) =>
        transformer ? transformer(val) : (val as T)
      );
    } else {
      return new Array(rowCount);
    }
  };
}

/**
 * @param input
 * @param columnImportRules
 * @returns
 */
export function processTableWithImportRules(
  input: Table,
  columnImportRules: FireColumnRules
): Table {
  let output: Table = [];
  // remove the headers from the input data, we don't want to import that row
  const headers = input.shift();
  const rowCount = input.length;
  for (const columnName of FIRE_COLUMNS) {
    const colRule = columnImportRules[columnName as keyof FireColumnRules];

    if (!colRule) {
      output.push(new Array(rowCount));
      continue;
    }

    let column: any[];
    try {
      column = colRule(input);
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

  static deleteLastRow(data: Table): Table {
    data.pop();
    return data;
  }

  static sortByDate(dateColumn: number) {
    return (data: Table) => {
      data
        .sort(
          (row1, row2) =>
            new Date(row1[dateColumn]).getTime() -
            new Date(row2[dateColumn]).getTime()
        )
        .reverse();
      return data;
    };
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

  static ensureLength(arr: unknown[], length: number) {
    if (arr.length < length) {
      return [
        ...arr,
        ...new Array(length - arr.length).fill(null),
      ];
    }
    return arr.slice(0, length);
  }
}
