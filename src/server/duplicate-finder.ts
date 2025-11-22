import type { Table } from "@/common/types";
import type { FireColumn } from "@/common/constants";

function findIndexByHeaderName(headers: FireColumn[], headerName: FireColumn): number {
    return headers.findIndex(cell => cell.toLowerCase() === headerName.toLowerCase());
}

export function generateDuplicateHash(headers: FireColumn[], row: string[], columns: FireColumn[]): string {
    return columns.map(col => row[findIndexByHeaderName(headers, col)]).join('|');
}

/**
 * Finds duplicate rows in a dataset based on specified columns and a timespan.
 *
 * @param {Table} table - The array of rows to search for duplicates.
 * @param {FireColumn[]} compareCols - The columns to use for identifying duplicates.
 * @param {number} timespan - The maximum allowed time difference (in milliseconds) between duplicate rows.
 * @param {FireColumn} dateColumn - The name of the column containing the date to compare.
 * @returns {Table} - An array of duplicate rows found within the specified timespan.
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
export function findDuplicates(table: Table, compareCols: FireColumn[], timespan: number, dateColumn: FireColumn = 'date'): Table {
    const duplicates: Table = [];
    const seenIndices: Set<number> = new Set();
    
    // we need at least 1 header row + two data rows to find duplicates
    if (table.length < 2) {
        return [];
    }

    // Skip the header row
    const headers = table[0] as FireColumn[];
    const rows = table.slice(1); // Skip the header row

    const dateColumnIndex = findIndexByHeaderName(headers, dateColumn);

    rows.forEach((row, index) => {
        const key = generateDuplicateHash(headers, row, compareCols);
        const rowDate = new Date(row[dateColumnIndex]);

        for (let i = index + 1; i < rows.length; i++) {
            const compareRow = rows[i];
            const compareKey = generateDuplicateHash(headers, compareRow, compareCols);
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
