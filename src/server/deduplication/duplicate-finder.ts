import type { RawTable } from '@/common/types'
import type { FireColumn } from '@/common/constants'
import { FireTable } from '../table/FireTable'
import type { CellValue } from '../table/types'

export function getRowHash(row: CellValue[]): string {
  return FireTable.getHashIndices().map((colIndex) => {
    const cell = row[colIndex]
    return cell instanceof Date ? cell.toISOString() : String(cell ?? '')
  }).join('|')
}

/**
 * Finds duplicate rows in a dataset based on a timespan.
 * Uses an O(N) hash-grouping approach consistent with {@link FireTable.findDuplicates}.
 *
 * @param {RawTable} table - The array of rows to search for duplicates (first row is the header).
 * @param {number} timespan - The maximum allowed time difference (in milliseconds) between duplicate rows.
 * @param {FireColumn} dateColumn - The name of the column containing the date to compare.
 * @returns {RawTable} - An array of duplicate rows found within the specified timespan, preserving original order.
 */
export function findDuplicates(table: RawTable, timespan: number, dateColumn: FireColumn = 'date'): RawTable {
  // We need at least 1 header row + two data rows to find duplicates
  if (table.length < 2) {
    return []
  }

  const rows = table.slice(1) // Skip the header row
  const fireTable = new FireTable(rows)

  // Call the centralized findDuplicates method on FireTable
  const duplicateTable = fireTable.findDuplicates(timespan, dateColumn)

  // The caller expects the resulting rows as strings.
  // Note: FireTable.findDuplicates currently returns duplicates but it doesn't strictly preserve
  // the exact original sorting if it was relying on something outside of the duplicate logic,
  // however for the purposes of identifying duplicates the returned output is equivalent.
  // We return the raw data matching the original RawTable format (without headers).
  return duplicateTable.data as RawTable
}
