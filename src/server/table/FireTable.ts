import type { FireColumn } from '@/common/constants';
import { FIRE_COLUMNS } from '@/common/constants';
import type { FireColumnRules } from '../types';
import type { CellValue } from './types';
import { Table } from './Table';
import { Config } from '../config';
import { AccountUtils } from '../accounts/account-utils';
import { Transformers } from '../transformers';
import { detectCategoryByTextAnalysis } from '../category-detection/detection';
import { Logger } from '@/common/logger';

/**
 * A table with knowledge of the FIRE column structure.
 *
 * Extends the generic `Table` with methods specific to the FIRE spreadsheet columns,
 * such as accessing columns by FireColumn name, sorting by date, finding duplicates,
 * and categorizing transactions.
 *
 * @example
 * ```ts
 * const fireTable = FireTable.fromCSV({ headers, rows, config });
 * fireTable.sortByDate();
 *
 * const categories = fireTable.getFireColumn('category');
 * ```
 */
export class FireTable extends Table {
  override clone(): FireTable {
    return new FireTable(this.data.map((row) => [...row]));
  }

  // ──────────────────────────────────────────────
  // FIRE Column Access
  // ──────────────────────────────────────────────

  /**
   * Returns the 0-based column index for a FIRE column name.
   * Returns -1 if the column is not found.
   */
  getFireColumnIndex(column: FireColumn): number {
    return FIRE_COLUMNS.findIndex((col) => col.toLowerCase() === column);
  }

  /**
   * Returns all values in the given FIRE column.
   */
  getFireColumn(column: FireColumn): CellValue[] {
    const index = this.getFireColumnIndex(column);
    if (index === -1) return [];
    return this.retrieveColumn(index);
  }

  // ──────────────────────────────────────────────
  // FIRE-specific operations
  // ──────────────────────────────────────────────

  /**
   * Sorts the table by the fire `date` column in descending order (newest first).
   */
  sortByDate(): this {
    const dateColumn = this.getFireColumnIndex('date');
    if (dateColumn !== -1) {
      this.data = this.data.toSorted(
        (row1, row2) =>
          new Date(String(row2[dateColumn])).getTime() -
          new Date(String(row1[dateColumn])).getTime(),
      );
    }
    return this;
  }

  /**
   * Finds duplicate rows based on specified FIRE columns and a time window.
   *
   * @param compareCols - The FIRE columns to use for identifying duplicates.
   * @param timespanMs - Maximum time difference in milliseconds between duplicate rows.
   * @param dateColumn - The FIRE column containing the date for timespan comparison.
   * @returns A new FireTable containing only the duplicate rows.
   */
  findDuplicates(
    compareCols: FireColumn[],
    timespanMs: number,
    dateColumn: FireColumn = 'date',
  ): FireTable {
    if (this.data.length < 2) {
      return new FireTable([]);
    }

    const dateColumnIndex = this.getFireColumnIndex(dateColumn);
    const generateHash = (row: CellValue[]): string =>
      compareCols.map((col) => row[this.getFireColumnIndex(col)]).join('|');

    const hashGroups = this.groupRowsByHash(generateHash, dateColumnIndex);
    const duplicates = this.collectDuplicatesFromGroups(hashGroups, timespanMs);

    return new FireTable(duplicates);
  }

  /** Groups rows by a hash key, pairing each with its parsed date. */
  private groupRowsByHash(
    generateHash: (row: CellValue[]) => string,
    dateColumnIndex: number,
  ): Map<string, { row: CellValue[]; date: Date }[]> {
    const groups = new Map<string, { row: CellValue[]; date: Date }[]>();

    for (const row of this.data) {
      const key = generateHash(row);
      const entry = { row, date: new Date(String(row[dateColumnIndex])) };
      const group = groups.get(key);
      if (group) {
        group.push(entry);
      } else {
        groups.set(key, [entry]);
      }
    }

    return groups;
  }

  /** Collects duplicate rows from hash groups using a time-window comparison. */
  private collectDuplicatesFromGroups(
    hashGroups: Map<string, { row: CellValue[]; date: Date }[]>,
    timespanMs: number,
  ): CellValue[][] {
    const duplicates: CellValue[][] = [];

    for (const group of hashGroups.values()) {
      if (group.length < 2) continue;

      // Sort by date for efficient sliding-window comparison
      group.sort((a, b) => a.date.getTime() - b.date.getTime());

      const isDuplicate = this.markDuplicatesInGroup(group, timespanMs);

      for (let i = 0; i < group.length; i++) {
        if (isDuplicate[i]) duplicates.push(group[i].row);
      }
    }

    return duplicates;
  }

  /** Marks which entries in a date-sorted group are duplicates within the timespan. */
  private markDuplicatesInGroup(
    group: { row: CellValue[]; date: Date }[],
    timespanMs: number,
  ): boolean[] {
    const isDuplicate = new Array<boolean>(group.length).fill(false);

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[j].date.getTime() - group[i].date.getTime() > timespanMs) break;
        isDuplicate[i] = true;
        isDuplicate[j] = true;
      }
    }

    return isDuplicate;
  }

  /**
   * Auto-categorizes transactions that don't have a category set.
   * Uses text analysis on the `contra_account` column to detect categories.
   *
   * @returns An object with category update values (one per row) and a count of categorized rows.
   */
  categorize(): {
    categoryUpdates: string[][];
    rowsCategorized: number;
  } {
    const categoryColIndex = this.getFireColumnIndex('category');
    const contraAccountIndex = this.getFireColumnIndex('contra_account');

    let rowsCategorized = 0;
    const categoryUpdates: string[][] = [];

    for (const row of this.data) {
      const category = String(row[categoryColIndex] ?? '');
      const contraAccount = String(row[contraAccountIndex] ?? '');

      let newCategory = category;

      if (!category || category === '') {
        const detectedCategory = detectCategoryByTextAnalysis(contraAccount);
        if (detectedCategory) {
          newCategory = detectedCategory;
          rowsCategorized++;
        }
      }

      categoryUpdates.push([newCategory]);
    }

    return { categoryUpdates, rowsCategorized };
  }

  // ──────────────────────────────────────────────
  // Factory: Build a FireTable from CSV import data
  // ──────────────────────────────────────────────

  /**
   * Processes raw CSV input data and shapes it into the FIRE spreadsheet structure.
   *
   * Uses the account configuration to map CSV columns to FIRE columns, applying
   * transformations where needed (date parsing, money parsing, etc.).
   *
   * @param headers - The CSV header row
   * @param rows - The CSV data rows (without header)
   * @param config - The account configuration with column mappings
   * @returns A FireTable with data structured according to FIRE_COLUMNS
   */
  static fromCSV({
    headers,
    rows,
    config,
  }: {
    headers: string[];
    rows: CellValue[][];
    config: Config;
  }): FireTable {
    const output: CellValue[][] = [];
    const rowCount = rows.length;
    const cols = Table.transpose(rows);

    function buildColumn<T>(
      fireColumn: FireColumn,
      transformer?: (value: string) => T,
    ): (T | null)[] {
      const columnIndex = config.getColumnIndex(fireColumn, headers);
      if (typeof columnIndex === 'number' && cols[columnIndex] !== undefined) {
        return cols[columnIndex].map((val) => {
          if (val === '' || val === null || typeof val === 'undefined') return null;
          return transformer ? transformer(String(val)) : (val as unknown as T);
        });
      }
      return new Array<T | null>(rowCount).fill(null);
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
    };

    for (const columnName of FIRE_COLUMNS) {
      const colRule =
        columnImportRules[columnName as keyof FireColumnRules];

      if (!colRule) {
        output.push(new Array(rowCount));
        continue;
      }

      let column: (string | number | Date | null)[];
      try {
        column = colRule();
        column = Table.ensureLength(column, rowCount);
      } catch (e) {
        Logger.error(e);
        column = new Array(rowCount);
      }
      output.push(column as CellValue[]);
    }

    // output is currently column-oriented, transpose to row-oriented
    const transposed = Table.transpose(output);
    return new FireTable(transposed);
  }
}
