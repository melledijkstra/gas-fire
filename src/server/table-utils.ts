import type { Table as TableType } from '@/common/types';
import { getSourceSheet } from './globals';
import type { Config } from './config';
import { FireTable } from './models/FireTable';
import { FireSheet } from './models/FireSheet';
import { Table } from '@/common/models/Table';
import type { FireColumn } from '@/common/constants';

/**
 * Uses the account configuration and the input data from the user
 * to generate import data structured in the way of the Firesheet
 * 
 * @param {TableType} input the input data from the user in the CSV format of the bank
 * @param {Config} config the configuration for the account that is used to import the data
 * @returns {TableType} the data structured in the way of the Firesheet
 * @deprecated Use FireTable.fromBankData instead
 */
export function processInputDataAndShapeFiresheetStructure({
  headers,
  rows,
  config,
}: {
  headers: string[];
  rows: TableType;
  config: Config;
}): TableType {
  const fireTable = FireTable.fromBankData({ headers, rows, config });
  return fireTable.getData() as TableType;
}

export class TableUtils {
  /**
   * Imports data in structure of a table into the source sheet
   * @param {TableType} data the data to be imported into the source sheet
   * @param {number[]} autoFillColumns optional column indices to autofill
   */
  static importData(data: TableType, autoFillColumns?: number[]) {
    const sourceSheet = getSourceSheet();
    if (!sourceSheet) {
      console.error('Error: The sourceSheet was not found. Cannot import data.');
      return;
    }

    const fireSheet = new FireSheet(sourceSheet);
    const fireTable = new FireTable(data as unknown[][]);
    fireSheet.importData(fireTable, autoFillColumns);
  }

  /**
   * @deprecated Use Table.transpose() instead
   */
  static transpose<T>(outerlist: T[][]): T[][] {
    return new Table(outerlist).transpose().getData();
  }

  /**
   * @deprecated Use Table.getColumn() instead
   */
  static retrieveColumn(data: TableType, columnIndex: number): string[] {
    return new Table(data).getColumn(columnIndex);
  }

  /**
   * @deprecated Use Table.deleteRow(0) instead
   */
  static deleteFirstRow(data: TableType): TableType {
    return new Table(data).deleteRow(0).getData();
  }

  /**
   * @deprecated Use Table.removeEmptyRows() instead
   */
  static removeEmptyRows(data: TableType): TableType {
    return new Table(data).removeEmptyRows().getData();
  }

  /**
   * @deprecated Use Table.deleteRow(data.length - 1) instead
   */
  static deleteLastRow(data: TableType): TableType {
    const table = new Table(data);
    return table.deleteRow(table.getRowCount() - 1).getData();
  }

  /**
   * @deprecated Use Table.sortByColumn() instead
   */
  static sortByDate(data: TableType, dateColumn: number) {
    return new Table(data).sortByColumn(dateColumn, 'desc').getData();
  }

  /**
   * @deprecated Use Table.deleteColumns() instead
   */
  static deleteColumns(table: TableType, colIndices: number[]): TableType {
    return new Table(table).deleteColumns(colIndices).getData();
  }

  /**
   * @deprecated Handled internally by Table class or specific logic
   */
  static ensureLength<T>(arr: (T | null)[], length: number): (T | null)[] {
    if (arr.length < length) {
      return [
        ...arr,
        ...new Array(length - arr.length).fill(null),
      ];
    }
    return arr.slice(0, length);
  }

  /**
   * @deprecated Use FireTable.getColumnIndex instead
   */
  static getFireColumnIndexByName(column: FireColumn): number {
    return FireTable.getColumnIndex(column);
  }
}
