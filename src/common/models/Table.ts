/**
 * A generic, engine-agnostic representation of tabular data.
 * Tables by default define rows.
 */
export class Table<T = unknown> {
  protected data: T[][];

  constructor(data: T[][] = []) {
    this.data = data;
  }

  /**
   * Creates a new Table from raw data.
   */
  static from<U>(data: U[][]): Table<U> {
    return new Table<U>(data);
  }

  /**
   * Returns a deep clone of the table.
   */
  clone(): Table<T> {
    return new Table<T>(structuredClone(this.data));
  }

  /**
   * Returns the raw 2D array data.
   */
  getData(): T[][] {
    return this.data;
  }

  /**
   * Returns a specific row.
   */
  getRow(index: number): T[] | undefined {
    return this.data[index];
  }

  /**
   * Returns a specific column.
   */
  getColumn(index: number): T[] {
    return this.data.map((row) => row[index]);
  }

  /**
   * Returns the number of rows.
   */
  getRowCount(): number {
    return this.data.length;
  }

  /**
   * Returns the number of columns (based on the first row).
   */
  getColCount(): number {
    return this.data[0]?.length ?? 0;
  }

  /**
   * Transposes the table (swaps rows and columns).
   * Mutates the current table.
   */
  transpose(): this {
    if (this.data.length === 0) return this;

    const result: T[][] = [];
    for (let i = 0; i < this.data.length; i++) {
      for (let j = 0; j < this.data[i].length; j++) {
        if (!result[j]) result[j] = [];
        result[j][i] = this.data[i][j];
      }
    }
    this.data = result;
    return this;
  }

  /**
   * Deletes a row at the given index.
   * Mutates the current table.
   */
  deleteRow(index: number): this {
    this.data.splice(index, 1);
    return this;
  }

  /**
   * Deletes columns at the given indices.
   * Mutates the current table.
   */
  deleteColumns(indices: number[]): this {
    const sortedIndices = [...indices].sort((a, b) => b - a);
    this.data = this.data.map((row) => {
      const newRow = [...row];
      for (const index of sortedIndices) {
        newRow.splice(index, 1);
      }
      return newRow;
    });
    return this;
  }

  /**
   * Filters rows based on a predicate.
   * Mutates the current table.
   */
  filter(predicate: (row: T[], index: number) => boolean): this {
    this.data = this.data.filter(predicate);
    return this;
  }

  /**
   * Maps each row to a new format.
   * Mutates the current table.
   */
  map(callback: (row: T[], index: number) => T[]): this {
    this.data = this.data.map(callback);
    return this;
  }

  /**
   * Sorts the table by a specific column.
   * Mutates the current table.
   */
  sortByColumn(index: number, direction: 'asc' | 'desc' = 'asc'): this {
    this.data.sort((a, b) => {
      const valA = a[index];
      const valB = b[index];
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      const result = valA < valB ? -1 : 1;
      return direction === 'asc' ? result : -result;
    });
    return this;
  }

  /**
   * Removes empty rows.
   * Mutates the current table.
   */
  removeEmptyRows(): this {
    this.data = this.data.filter((row) => row.some((cell) => cell !== '' && cell !== null && cell !== undefined));
    return this;
  }
}
