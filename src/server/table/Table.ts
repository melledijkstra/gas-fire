import type { CellValue } from './types'

const EMPTY = ''

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
  protected data: CellValue[][]

  constructor(data: CellValue[][] = []) {
    this.data = data
  }

  /**
   * Creates a shallow clone of the table (each row is shallow-copied).
   */
  clone(): Table {
    return new Table(this.data.map(row => [...row]))
  }

  // ──────────────────────────────────────────────
  // Accessors (non-mutating)
  // ──────────────────────────────────────────────

  /**
   * Returns the underlying 2D data array.
   */
  getData(): CellValue[][] {
    return this.data
  }

  get headers(): CellValue[] | null {
    return this.data?.[0] ?? null
  }

  /**
   * Returns a single row by index, or undefined if out of bounds.
   */
  getRow(index: number): CellValue[] | undefined {
    return this.data?.[index]
  }

  getRowCount(): number {
    return this.data.length
  }

  getColumnCount(): number {
    return this.data.reduce((max, row) => Math.max(max, row?.length ?? 0), 0)
  }

  isEmpty(): boolean {
    return this.data.length === 0
  }

  /**
   * Returns all values in the given column index.
   * Missing values default to null.
   */
  retrieveColumn(columnIndex: number): CellValue[] {
    const column = this.data.map(row => row?.[columnIndex] ?? null)
    // if the column index is out of bounds for all rows, return an empty array
    return column.every(cell => cell === null) ? [] : column
  }

  // ──────────────────────────────────────────────
  // Mutating operations (return `this` for chaining)
  // ──────────────────────────────────────────────

  /**
   * Transposes the table: rows become columns and columns become rows.
   */
  transpose(): this {
    this.data = Table.transpose(this.data)
    return this
  }

  /**
   * Removes rows where every cell is empty (empty string, null, or undefined).
   */
  removeEmptyRows(): this {
    this.data = this.data.filter(row =>
      row.some(cell => cell !== EMPTY && cell !== null && cell !== undefined),
    )
    return this
  }

  /**
   * Removes the first row of the table and returns it.
   */
  shiftRow(): CellValue[] | undefined {
    return this.data.shift()
  }

  /**
   * Removes the last row of the table.
   */
  deleteLastRow(): this {
    this.data.pop()
    return this
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
      if (comparator) return comparator(row1[columnIndex], row2[columnIndex])
      return String(row1[columnIndex]).localeCompare(
        String(row2[columnIndex]),
      )
    })
    return this
  }

  /**
   * Deletes a row at the given index.
   * Mutates the current table.
   */
  deleteRow(index: number): this {
    this.data.splice(index, 1)
    return this
  }

  /**
   * Deletes rows at the specified indices.
   * Indices are 0-based.
   */
  deleteRows(rowIndices: number[]): this {
    const sortedIndices = [...rowIndices].sort((a, b) => b - a)
    for (const delIndex of sortedIndices) {
      if (this.data[delIndex] !== undefined) {
        this.data.splice(delIndex, 1)
      }
    }
    return this
  }

  /**
   * Deletes columns at the specified indices.
   * Indices are 0-based.
   */
  deleteColumns(colIndices: number[]): this {
    const sortedIndices = [...colIndices].sort((a, b) => b - a)
    this.transpose()
    for (const delIndex of sortedIndices) {
      if (this.data[delIndex] !== undefined) {
        this.data.splice(delIndex, 1)
      }
    }
    this.transpose()
    return this
  }

  /**
   * Filters rows based on a predicate.
   * Mutates the current table.
   */
  filter(predicate: (row: CellValue[], index: number) => boolean): this {
    this.data = this.data.filter((row, index) => predicate(row, index))
    return this
  }

  /**
   * Maps each row to a new format.
   * Mutates the current table.
   */
  map(callback: (row: CellValue[], index: number) => CellValue[]): this {
    this.data = this.data.map((row, index) => callback(row, index))
    return this
  }

  /**
   * Serializes the table to a JSON string.
   * Useful for debugging or transferring data.
   */
  serialize(): string {
    return JSON.stringify(this.data, (_key, value) => {
      if (value instanceof Date) {
        return { __type: 'Date', value: value.toISOString() }
      }
      return value
    })
  }

  deserialize(serializedData: string): this {
    try {
      const parsed = JSON.parse(serializedData, (_key, value) => {
        if (value?.__type === 'Date') {
          return new Date(value.value)
        }
        return value
      })
      if (Array.isArray(parsed) && parsed.every(row => Array.isArray(row))) {
        this.data = parsed
      }
      else {
        throw new Error('Invalid data format for deserialization')
      }
    }
    catch (error) {
      console.error('Failed to deserialize data:', error)
    }
    return this
  }

  // ──────────────────────────────────────────────
  // Static utilities
  // ──────────────────────────────────────────────

  /**
   * Factory method to create a Table from a 2D array.
   */
  static from(data: CellValue[][]): Table {
    return new Table(data)
  }

  /**
   * Ensures an array has exactly the given length by padding with null or truncating.
   */
  static ensureLength<T>(arr: (T | null)[], length: number): (T | null)[] {
    if (arr.length < length) {
      return [...arr, ...new Array<T | null>(length - arr.length).fill(null)]
    }
    return arr.slice(0, length)
  }

  /**
   * Static transpose utility that works on raw 2D arrays without needing an instance.
   * @see https://github.com/ramda/ramda/blob/v0.27.0/source/transpose.js
   */
  static transpose<T>(outerlist: T[][]): T[][] {
    let i = 0
    const result: T[][] = []
    while (i < outerlist.length) {
      const innerlist = outerlist[i]
      let j = 0
      while (j < innerlist.length) {
        if (typeof result[j] === 'undefined') {
          result[j] = []
        }
        result[j].push(innerlist[j])
        j += 1
      }
      i += 1
    }
    return result
  }
}
