import type { FireColumn } from '@/common/constants'
import { FIRE_COLUMNS } from '@/common/constants'
import { getRowHash } from '@/common/helpers'
import type { CellValue } from '@/common/types'
import { Table } from './Table'

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
export class FireTable extends Table<CellValue> {
  protected cachedHashes: Set<string> | null = null

  constructor(data: CellValue[][] = []) {
    super([...FIRE_COLUMNS], data)
  }

  getHashes(force = false): Set<string> {
    return this.calculateHashes(force)
  }

  invalidateHashes(): void {
    this.cachedHashes = null
  }

  // ──────────────────────────────────────────────
  // FIRE Column Access
  // ──────────────────────────────────────────────

  /**
   * Returns all values in the given FIRE column.
   */
  getFireColumn(column: FireColumn): CellValue[] {
    const index = FireTable.getFireColumnIndex(column)
    if (index === -1) return []
    return this.retrieveColumn(index)
  }

  // ──────────────────────────────────────────────
  // FIRE-specific operations
  // ──────────────────────────────────────────────

  /**
   * Sorts the table by the fire `date` column in descending order (newest first).
   */
  sortByDate(): this {
    const dateColumn = FireTable.getFireColumnIndex('date')
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
   * Finds duplicate rows based on specified FIRE columns and a time window.
   *
   * @param compareCols - The FIRE columns to use for identifying duplicates.
   * @param timespanMs - Maximum time difference in milliseconds between duplicate rows.
   * @param dateColumn - The FIRE column containing the date for timespan comparison.
   * @returns A new FireTable containing only the duplicate rows.
   */
  findDuplicates(
    timespanMs: number,
    dateColumn: FireColumn = 'date',
  ): FireTable {
    if (this._data.length < 2) {
      return new FireTable([])
    }

    const dateColumnIndex = FireTable.getFireColumnIndex(dateColumn)

    const hashGroups = this.groupRowsByHash(dateColumnIndex)
    const duplicates = this.collectDuplicatesFromGroups(hashGroups, timespanMs)

    return new FireTable(duplicates)
  }

  clone(): FireTable {
    const clonedData = this._data.map(row => [...row])
    return new FireTable(clonedData)
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

  // ──────────────────────────────────────────────
  // Factory: Build a FireTable from CSV import data
  // ──────────────────────────────────────────────

  /**
   * Returns the 0-based column index for a FIRE column name.
   * Returns -1 if the column is not found.
   */
  static getFireColumnIndex(column: FireColumn): number {
    return FIRE_COLUMNS.findIndex(col => col.toLowerCase() === column)
  }
}
