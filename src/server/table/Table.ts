import type { CellValue } from './types'

const EMPTY = ''

/**
 * An in-memory table abstraction that holds headers and data as a 2D array of CellValues.
 *
 * Supports mutable operations that return `this` for method chaining (builder pattern).
 *
 * @example
 * ```ts
 * const table = new Table(
 *  ['Column A', 'Column B'], [
 *  ['Row 1A', 'Row 1B'],
 *  ['Row 2A', 'Row 2B']
 * ]);
 *
 * table.removeEmptyRows().sortByColumn(1);
 * ```
 */
export class Table<T = CellValue> {
  protected _data: T[][]
  protected _headers: string[]

  constructor(headers: string[] = [], data: T[][] = []) {
    this._headers = headers
    this._data = data
  }

  // ──────────────────────────────────────────────
  // Accessors (non-mutating)
  // ──────────────────────────────────────────────

  /**
   * Returns the underlying 2D data array.
   */
  get data(): T[][] {
    return this._data
  }

  get headers(): string[] {
    return this._headers
  }

  /**
   * Returns a single row by index, or undefined if out of bounds.
   */
  getRow(index: number): T[] | undefined {
    return this._data?.[index]
  }

  getRowCount(): number {
    return this._data.length
  }

  getColumnCount(): number {
    return this._data.reduce((max, row) => Math.max(max, row?.length ?? 0), 0)
  }

  isEmpty(): boolean {
    return this._data.length === 0
  }

  /**
   * Returns all values in the given column index.
   * Missing values default to null.
   */
  retrieveColumn(columnIndex: number): (T | null)[] {
    return Table.retrieveColumn(this._data, columnIndex)
  }

  /**
   * Returns all values in the given column name.
   */
  getColumn(headerName: string): (T | null)[] {
    const index = this._headers.indexOf(headerName)
    if (index === -1) return []
    return this.retrieveColumn(index)
  }

  // ──────────────────────────────────────────────
  // Mutating operations (return `this` for chaining)
  // ──────────────────────────────────────────────

  /**
   * Removes rows where every cell is empty (empty string, null, or undefined).
   */
  removeEmptyRows(): this {
    this._data = Table.removeEmptyRows(this._data)
    return this
  }

  /**
   * Removes the last row of the table.
   */
  deleteLastRow(): this {
    this._data.pop()
    return this
  }

  /**
   * Sorts the table by a specific column using an optional comparator.
   * Default comparator performs string comparison.
   */
  sortByColumn(
    columnIndex: number,
    comparator?: (a: T, b: T) => number,
  ): this {
    this._data = this._data.toSorted((row1, row2) => {
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
    this._data.splice(index, 1)
    return this
  }

  /**
   * Deletes rows at the specified indices.
   * Indices are 0-based.
   */
  deleteRows(rowIndices: number[]): this {
    const sortedIndices = [...rowIndices].sort((a, b) => b - a)
    for (const delIndex of sortedIndices) {
      if (this._data[delIndex] !== undefined) {
        this._data.splice(delIndex, 1)
      }
    }
    return this
  }

  /**
   * Filters rows based on a predicate.
   * Mutates the current table.
   */
  filter(predicate: (row: T[], index: number) => boolean): this {
    this._data = this._data.filter((row, index) => predicate(row, index))
    return this
  }

  /**
   * Maps each row to a new format.
   * Mutates the current table.
   */
  map(callback: (row: T[], index: number) => T[]): this {
    this._data = this._data.map((row, index) => callback(row, index))
    return this
  }

  /**
   * Serializes the table to a JSON string.
   * Useful for debugging or transferring data.
   */
  serialize(): string {
    return JSON.stringify({ headers: this._headers, data: this._data }, (_key, value) => {
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
      if (parsed && Array.isArray(parsed.data)) {
        this._data = parsed.data
        this._headers = Array.isArray(parsed.headers) ? parsed.headers : []
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
   * Factory method to create a Table from a 2D array, assuming the first row contains headers.
   */
  static from<T = CellValue>(data: T[][]): Table<T> {
    const headers = data[0] as string[]
    const rows = data.slice(1)
    if (!headers || headers.length === 0) {
      throw new Error('No header row specified in input data!')
    }
    if (rows.some(row => !Array.isArray(row))) {
      throw new Error('All rows must be arrays when creating a Table with Table.from')
    }
    return new Table(headers ?? [], rows)
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

  static retrieveColumn<T>(data: T[][], columnIndex: number): (T | null)[] {
    const column = data.map(row => row?.[columnIndex] ?? null)
    // if the column index is out of bounds for all rows, return an empty array
    return column.every(cell => cell === null) ? [] : column
  }

  static removeEmptyRows<T>(data: T[][]): T[][] {
    return data.filter(row =>
      row.some(cell => cell !== EMPTY && cell !== null && cell !== undefined),
    )
  }
}
