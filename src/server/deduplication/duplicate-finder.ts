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
 *
 * @param {RawTable} table - The array of rows to search for duplicates.
 * @param {number} timespan - The maximum allowed time difference (in milliseconds) between duplicate rows.
 * @param {FireColumn} dateColumn - The name of the column containing the date to compare.
 * @returns {RawTable} - An array of duplicate rows found within the specified timespan.
 *
 * @example
 * const rows = [
 *   { id: 1, name: 'Alice', date: '2023-01-01T00:00:00Z' },
 *   { id: 2, name: 'Alice', date: '2023-01-01T00:00:01Z' },
 *   { id: 3, name: 'Bob', date: '2023-01-01T00:00:02Z' }
 * ];
 * const columns = ['name'];
 * const timespan = 1000; // 1 second
 * const duplicates = findDuplicates(rows, columns, timespan);
 * duplicates will contain the first two rows
 */
export function findDuplicates(table: RawTable, timespan: number, dateColumn: FireColumn = 'date'): RawTable {
  const duplicates: RawTable = [];
  const seenIndices: Set<number> = new Set();

  // we need at least 1 header row + two data rows to find duplicates
  if (table.length < 2) {
    return [];
  }

  const rows = table.slice(1); // Skip the header row

  const dateColumnIndex = FireTable.getFireColumnIndex(dateColumn);

  rows.forEach((row, index) => {
    const key = getRowHash(row);
    const rowDate = new Date(row[dateColumnIndex]);

    for (let i = index + 1; i < rows.length; i++) {
      const compareRow = rows[i];
      const compareKey = getRowHash(compareRow);
      const compareDate = new Date(compareRow[dateColumnIndex]);

      // Check if the current row and the comparison row have the same key and their dates 
      // are within the specified timespan
      if (key === compareKey && Math.abs(rowDate.getTime() - compareDate.getTime()) <= timespan) {

        if (!seenIndices.has(index)) {
          duplicates.push(row);
          seenIndices.add(index);
        }

        if (!seenIndices.has(i)) {
          duplicates.push(compareRow);
          seenIndices.add(i);
        }

        // Break the loop as we found a duplicate for the current row
        break;
      }
    }
  });

  return duplicates;
}
