import type { CellValue } from './types';

const EMPTY = '';

/**
 * An in-memory table abstraction that holds data as a 2D array of CellValues.
 *
 * Supports mutable operations that return `this` for method chaining (builder pattern).
 * Use `.clone()` to create a copy before mutating when immutability is needed.
 *
 * @example
 * ```ts
 * const table = new Table(data);
 * table.removeEmptyRows().sortByColumn(1);
 *
 * // Immutable usage:
 * const sorted = table.clone().sortByColumn(1);
 * ```
 */
export class Table {
  protected data: CellValue[][];

  constructor(data: CellValue[][] = []) {
    this.data = data;
  }

  /**
   * Factory method to create a Table from a 2D array.
   */
  static from(data: CellValue[][]): Table {
    return new Table(data);
  }

  /**
   * Creates a shallow clone of the table (each row is shallow-copied).
   */
  clone(): Table {
    return new Table(this.data.map((row) => [...row]));
  }

  // ──────────────────────────────────────────────
  // Accessors (non-mutating)
  // ──────────────────────────────────────────────

  /**
   * Returns the underlying 2D data array.
   */
  getData(): CellValue[][] {
    return this.data;
  }

  /**
   * Returns a single row by index, or undefined if out of bounds.
   */
  getRow(index: number): CellValue[] | undefined {
    return this.data[index];
  }

  getRowCount(): number {
    return this.data.length;
  }

  getColumnCount(): number {
    return this.data[0]?.length ?? 0;
  }

  isEmpty(): boolean {
    return this.data.length === 0;
  }

  /**
   * Returns all values in the given column index.
   * Missing values default to an empty string.
   */
  retrieveColumn(columnIndex: number): CellValue[] {
    return this.data.map((row) => row?.[columnIndex] ?? EMPTY);
  }

  // ──────────────────────────────────────────────
  // Mutating operations (return `this` for chaining)
  // ──────────────────────────────────────────────

  /**
   * Transposes the table: rows become columns and columns become rows.
   * @see https://github.com/ramda/ramda/blob/v0.27.0/source/transpose.js
   */
  transpose(): this {
    let i = 0;
    const result: CellValue[][] = [];
    while (i < this.data.length) {
      const innerlist = this.data[i];
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
    this.data = result;
    return this;
  }

  /**
   * Removes rows where every cell is empty (empty string or null).
   */
  removeEmptyRows(): this {
    this.data = this.data.filter((row) =>
      row.some((cell) => cell !== EMPTY && cell !== null),
    );
    return this;
  }

  /**
   * Removes the first row of the table and returns it.
   */
  shiftRow(): CellValue[] | undefined {
    return this.data.shift();
  }

  /**
   * Removes the last row of the table.
   */
  deleteLastRow(): this {
    this.data.pop();
    return this;
  }

  /**
   * Sorts the table by a specific column using an optional comparator.
   * Default comparator performs string comparison.
   */
  sortByColumn(
    columnIndex: number,
    comparator?: (a: CellValue, b: CellValue) => number,
  ): this {
    this.data = this.data.toSorted((row1, row2) => {
      if (comparator) return comparator(row1[columnIndex], row2[columnIndex]);
      return String(row1[columnIndex]).localeCompare(
        String(row2[columnIndex]),
      );
    });
    return this;
  }

  /**
   * Deletes columns at the specified indices.
   * Indices are 0-based.
   */
  deleteColumns(colIndices: number[]): this {
    const sortedIndices = [...colIndices].sort().reverse();
    this.transpose();
    for (const delIndex of sortedIndices) {
      if (this.data[delIndex] !== undefined) {
        this.data.splice(delIndex, 1);
      }
    }
    this.transpose();
    return this;
  }

  // ──────────────────────────────────────────────
  // Static utilities
  // ──────────────────────────────────────────────

  /**
   * Ensures an array has exactly the given length by padding with null or truncating.
   */
  static ensureLength<T>(arr: (T | null)[], length: number): (T | null)[] {
    if (arr.length < length) {
      return [...arr, ...new Array<T | null>(length - arr.length).fill(null)];
    }
    return arr.slice(0, length);
  }

  /**
   * Static transpose utility that works on raw 2D arrays without needing an instance.
   */
  static transpose<T>(outerlist: T[][]): T[][] {
    let i = 0;
    const result: T[][] = [];
    while (i < outerlist.length) {
      const innerlist = outerlist[i];
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
}
