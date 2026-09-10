import type { YMYLColumn } from '@/common/constants'
import { YMYL_COLUMNS } from '@/common/constants'
import { getRowHash } from '@/common/helpers'
import type { CellValue } from '@/common/types'
import { Table } from './Table'

/**
 * A table with knowledge of the YMYL column structure.
 *
 * Extends the generic `Table` with methods specific to the YMYL spreadsheet columns,
 * such as accessing columns by YMYLColumn name, sorting by date, finding duplicates,
 * and categorizing transactions.
 *
 * @example
 * ```ts
 * const ymylTable = new YMYLTable(data);
 * ymylTable.sortByDate();
 *
 * const categories = ymylTable.getYMYLColumn('category');
 * ```
 */
export class YMYLTable extends Table<CellValue> {
  protected cachedHashes: Set<string> | null = null

  constructor(data: CellValue[][] = []) {
    super([...YMYL_COLUMNS], data)
  }

  getHashes(force = false): Set<string> {
    return this.calculateHashes(force)
  }

  invalidateHashes(): void {
    this.cachedHashes = null
  }

  // ──────────────────────────────────────────────
  // YMYL Column Access
  // ──────────────────────────────────────────────

  /**
   * Returns all values in the given YMYL column.
   */
  getYMYLColumn(column: YMYLColumn): CellValue[] {
    const index = YMYLTable.getYMYLColumnIndex(column)
    if (index === -1) return []
    return this.retrieveColumn(index)
  }

  // ──────────────────────────────────────────────
  // YMYL-specific operations
  // ──────────────────────────────────────────────

  /**
   * Sorts the table by the ymyl `date` column in descending order (newest first).
   */
  sortByDate(): this {
    const dateColumn = YMYLTable.getYMYLColumnIndex('date')
    if (dateColumn !== -1) {
      this._data = this._data.toSorted(
        (row1, row2) =>
          new Date(String(row2[dateColumn])).getTime()
            - new Date(String(row1[dateColumn])).getTime(),
      )
      this.invalidateHashes() // Invalidate cached hashes since row order changed
    }
    return this
  }

  /**
   * Finds duplicate rows based on specified YMYL columns and a time window.
   *
   * @param timespanMs - Maximum time difference in milliseconds between duplicate rows.
   * @param dateColumn - The YMYL column containing the date for timespan comparison.
   * @returns A new YMYLTable containing only the duplicate rows.
   */
  findDuplicates(
    timespanMs: number,
    dateColumn: YMYLColumn = 'date',
  ): YMYLTable {
    if (this._data.length < 2) {
      return new YMYLTable([])
    }

    const dateColumnIndex = YMYLTable.getYMYLColumnIndex(dateColumn)

    const hashGroups = this.groupRowsByHash(dateColumnIndex)
    const duplicates = this.collectDuplicatesFromGroups(hashGroups, timespanMs)

    return new YMYLTable(duplicates)
  }

  clone(): YMYLTable {
    const clonedData = this._data.map(row => [...row])
    return new YMYLTable(clonedData)
  }

  /** Groups rows by a hash key, pairing each with its parsed date and original index. */
  private groupRowsByHash(dateColumnIndex: number): Map<string, { row: CellValue[], date: Date, originalIndex: number }[]> {
    const groups = new Map<string, { row: CellValue[], date: Date, originalIndex: number }[]>()

    for (let index = 0; index < this._data.length; index++) {
      const row = this._data[index]
      const key = getRowHash(row)
      const entry = { row, date: new Date(String(row[dateColumnIndex])), originalIndex: index }
      const group = groups.get(key)
      if (group) {
        group.push(entry)
      }
      else {
        groups.set(key, [entry])
      }
    }

    return groups
  }

  /** Collects duplicate rows from hash groups using a time-window comparison, preserving original order. */
  private collectDuplicatesFromGroups(
    hashGroups: Map<string, { row: CellValue[], date: Date, originalIndex: number }[]>,
    timespanMs: number,
  ): CellValue[][] {
    const duplicatesWithIndex: { row: CellValue[], originalIndex: number }[] = []

    for (const group of hashGroups.values()) {
      if (group.length < 2) continue

      // Sort by date for efficient sliding-window comparison
      group.sort((a, b) => a.date.getTime() - b.date.getTime())

      const isDuplicate = this.markDuplicatesInGroup(group, timespanMs)

      for (let i = 0; i < group.length; i++) {
        if (isDuplicate[i]) duplicatesWithIndex.push({ row: group[i].row, originalIndex: group[i].originalIndex })
      }
    }

    // Sort by original index to preserve input row order
    duplicatesWithIndex.sort((a, b) => a.originalIndex - b.originalIndex)

    return duplicatesWithIndex.map(d => d.row)
  }

  /** Marks which entries in a date-sorted group are duplicates within the timespan. */
  private markDuplicatesInGroup(
    group: { row: CellValue[], date: Date }[],
    timespanMs: number,
  ): boolean[] {
    const isDuplicate = new Array<boolean>(group.length).fill(false)

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[j].date.getTime() - group[i].date.getTime() > timespanMs) break
        isDuplicate[i] = true
        isDuplicate[j] = true
      }
    }

    return isDuplicate
  }

  private calculateHashes(force = false): Set<string> {
    if (force || this._data.length !== this.cachedHashes?.size) {
      this.cachedHashes = new Set(this._data.map(row => getRowHash(row)))
    }
    return this.cachedHashes
  }

  /**
   * Returns the 0-based column index for a YMYL column name.
   * Returns -1 if the column is not found.
   */
  static getYMYLColumnIndex(column: YMYLColumn): number {
    return YMYL_COLUMNS.findIndex(col => col.toLowerCase() === column)
  }
}
