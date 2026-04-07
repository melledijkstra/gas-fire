import type { RawTable } from "@/common/types";
import type { FireColumn } from "@/common/constants";
import { FireTable, type CellValue } from "../table";

export function getRowHash(row: CellValue[]): string {
  return FireTable.getHashIndices().map(colIndex => {
    const cell = row[colIndex];
    return cell instanceof Date ? cell.toISOString() : String(cell ?? '');
  }).join('|');
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
    return [];
  }

  const rows = table.slice(1); // Skip the header row
  const dateColumnIndex = FireTable.getFireColumnIndex(dateColumn);

  // O(N): Group rows by hash
  const groups = new Map<string, { row: string[]; date: Date; originalIndex: number }[]>();
  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const key = getRowHash(row);
    const entry = { row, date: new Date(row[dateColumnIndex]), originalIndex: index };
    const group = groups.get(key);
    if (group) {
      group.push(entry);
    } else {
      groups.set(key, [entry]);
    }
  }

  // Collect duplicates from groups that have 2+ entries
  const result: { row: string[]; originalIndex: number }[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    // Sort by date within group for efficient sliding-window comparison
    group.sort((a, b) => a.date.getTime() - b.date.getTime());

    const isDuplicate = new Array<boolean>(group.length).fill(false);
    
    // O(N) sliding window to mark duplicates within timespan
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        if (group[j].date.getTime() - group[i].date.getTime() > timespan) {
          break
        }
        isDuplicate[i] = true;
        isDuplicate[j] = true;
      }
    }

    // Collect marked duplicates, preserving original input order
    for (let i = 0; i < group.length; i++) {
      if (isDuplicate[i]) {
        result.push({ row: group[i].row, originalIndex: group[i].originalIndex });
      }
    }
  }

  // Sort by original index to preserve input row order
  result.sort((a, b) => a.originalIndex - b.originalIndex);

  return result.map(duplicate => duplicate.row);
}
