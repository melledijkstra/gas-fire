import { FIRE_COLUMNS, type FireColumn } from '@/common/constants';
import { Table } from '@/common/models/Table';
import type { Config } from '../config';
import { AccountUtils } from '../accounts/account-utils';
import { Transformers } from '../transformers';
import { Logger } from '@/common/logger';
import type { FireColumnRules } from '../types';

export type FireCellValue = string | number | Date | null;

/**
 * A specialized table that understands the "FIRE" schema.
 */
export class FireTable extends Table<FireCellValue> {
  /**
   * Returns the index of a column by its name.
   */
  static getColumnIndex(columnName: FireColumn): number {
    return FIRE_COLUMNS.indexOf(columnName);
  }

  /**
   * Returns a cell value by row index and column name.
   */
  getCellValue(rowIndex: number, columnName: FireColumn): FireCellValue {
    const colIndex = FireTable.getColumnIndex(columnName);
    return this.data[rowIndex]?.[colIndex];
  }

  /**
   * Sets a cell value by row index and column name.
   * Mutates the current table.
   */
  setCellValue(rowIndex: number, columnName: FireColumn, value: FireCellValue): this {
    const colIndex = FireTable.getColumnIndex(columnName);
    if (this.data[rowIndex]) {
      this.data[rowIndex][colIndex] = value;
    }
    return this;
  }

  /**
   * Uses the account configuration and the input data from the user
   * to generate import data structured in the way of the Firesheet.
   */
  static fromBankData({
    headers,
    rows,
    config,
  }: {
    headers: string[];
    rows: string[][];
    config: Config;
  }): FireTable {
    const rowCount = rows.length;
    const inputTable = Table.from(rows);
    inputTable.transpose();
    const cols = inputTable.getData();

    function buildColumn<T>(
      fireColumn: FireColumn,
      transformer?: (value: string) => T
    ): (T | null)[] {
      const columnIndex = config.getColumnIndex(fireColumn, headers);
      if (typeof columnIndex === 'number' && cols[columnIndex] !== undefined) {
        return cols[columnIndex].map((val) => {
          if (val === '') return null;
          return transformer ? transformer(val) : (val as unknown as T);
        });
      } else {
        return new Array(rowCount).fill(null);
      }
    }

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
    };

    const outputData: FireCellValue[][] = [];

    for (const columnName of FIRE_COLUMNS) {
      const colRule = columnImportRules[columnName as keyof FireColumnRules];

      if (!colRule) {
        outputData.push(new Array(rowCount).fill(null));
        continue;
      }

      let column: FireCellValue[];
      try {
        column = colRule() as FireCellValue[];
        // Ensure length
        if (column.length < rowCount) {
          column = [...column, ...new Array(rowCount - column.length).fill(null)];
        } else if (column.length > rowCount) {
          column = column.slice(0, rowCount);
        }
      } catch (e) {
        Logger.error(e);
        column = new Array(rowCount).fill(null);
      }
      outputData.push(column);
    }

    const fireTable = new FireTable(outputData);
    fireTable.transpose();
    return fireTable;
  }

  /**
   * Converts the table to a format suitable for Google Sheets (string[][]).
   */
  toRawData(): string[][] {
    return this.data.map((row) =>
      row.map((cell) => {
        if (cell === null || cell === undefined) return '';
        if (cell instanceof Date) return cell.toISOString(); // Or preferred format
        return String(cell);
      })
    );
  }
}
