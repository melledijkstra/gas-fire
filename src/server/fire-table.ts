import { Table } from '@/common/table';
import { FIRE_COLUMNS, type FireColumn } from '@/common/constants';
import type { TableData, TableCell } from '@/common/types';
import type { Config } from './config';
import { AccountUtils } from './accounts/account-utils';
import { Transformers } from './transformers';
import type { FireColumnRules } from './types';
import { Logger } from '@/common/logger';

export class FireTable extends Table {
  private static readonly columnMap: ReadonlyMap<FireColumn, number> = new Map(
    FIRE_COLUMNS.map((col, index) => [col, index])
  );

  constructor(data: TableData = []) {
    super(data);
  }

  public getColumnIndex(columnName: FireColumn): number {
    const index = FireTable.columnMap.get(columnName);
    if (index === undefined) {
      throw new Error(`Column ${columnName} is not a valid FIRE column.`);
    }
    return index;
  }

  public getColumnData(columnName: FireColumn): TableCell[] {
    const index = this.getColumnIndex(columnName);
    return this.retrieveColumn(index);
  }

  public sortByDate(): this {
    const dateIndex = this.getColumnIndex('date');
    super.sortByDate(dateIndex);
    return this;
  }

  public getLastImportDate(): Date | null {
    if (this.length < 2) return null; // Need at least header + 1 row

    const importDateCol = this.getColumnIndex('import_date');
    const lastImportDateRaw = this.data[1]?.[importDateCol];

    if (lastImportDateRaw === undefined || lastImportDateRaw === null || lastImportDateRaw === '') {
      return null;
    }

    const lastImportDateTime = lastImportDateRaw instanceof Date
      ? lastImportDateRaw.getTime()
      : new Date(String(lastImportDateRaw)).getTime();

    if (Number.isNaN(lastImportDateTime)) {
      return null;
    }

    return new Date(lastImportDateTime);
  }

  /**
   * Uses the account configuration and the input data from the user
   * to generate import data structured in the way of the Firesheet
   */
  public static fromInputData(
    headers: string[],
    rawData: TableData,
    config: Config
  ): FireTable {
    const rowCount = rawData.length;
    const inputTable = new Table(rawData);
    inputTable.transpose(); // Work with columns
    const cols = inputTable.getData();

    function buildColumn<T>(
      fireColumn: FireColumn,
      transformer?: (value: string) => T
    ): (T | null)[] {
      const columnIndex = config.getColumnIndex(fireColumn, headers);
      if (typeof columnIndex === 'number' && cols[columnIndex] !== undefined) {
        return cols[columnIndex].map((val) => {
          if (val === '' || val === null || val === undefined) return null;
          return transformer ? transformer(String(val)) : (val as unknown as T);
        });
      } else {
        return new Array(rowCount).fill(null);
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

    const outputTable = new Table([]);

    for (const columnName of FIRE_COLUMNS) {
      const colRule = columnImportRules[columnName as keyof FireColumnRules];

      if (!colRule) {
        outputTable.getData().push(new Array(rowCount).fill(null));
        continue;
      }

      let column: TableCell[];
      try {
        column = colRule() as TableCell[];
        // pad manually since we can't use instance methods on isolated arrays here easily
        if (column.length < rowCount) {
          column = [...column, ...new Array(rowCount - column.length).fill(null)];
        } else {
          column = column.slice(0, rowCount);
        }
      } catch (e) {
        Logger.error(e);
        column = new Array(rowCount).fill(null);
      }
      outputTable.getData().push(column);
    }
    
    outputTable.transpose(); // flip columns back to rows
    return new FireTable(outputTable.getData());
  }
}
