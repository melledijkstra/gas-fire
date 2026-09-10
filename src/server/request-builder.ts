import type { CellValue } from '@/common/types'

export function buildInsertRowsRequest(
  sheetId: number,
  startIndex: number,
  rowCount: number,
  inheritFromBefore: boolean = false,
): GoogleAppsScript.Sheets.Schema.Request {
  return {
    insertDimension: {
      range: {
        sheetId,
        dimension: 'ROWS',
        startIndex,
        endIndex: startIndex + rowCount,
      },
      inheritFromBefore,
    },
  }
}

export function buildInsertDataRequest(
  sheetId: number,
  data: CellValue[][],
  startRowIndex: number,
  startColumnIndex: number,
  cellDataGenerator: (cell: unknown) => GoogleAppsScript.Sheets.Schema.CellData,
  fields: string = 'userEnteredValue',
): GoogleAppsScript.Sheets.Schema.Request {
  const maxRowLength = data.reduce((max, row) => Math.max(max, row.length), 0)

  return {
    updateCells: {
      rows: data.map(row => ({
        values: row.map(cellDataGenerator),
      })),
      fields,
      range: {
        sheetId,
        startRowIndex,
        endRowIndex: startRowIndex + data.length,
        startColumnIndex,
        endColumnIndex: startColumnIndex + maxRowLength,
      },
    },
  }
}

export function buildAutoFillRequest(
  sourceRange: GoogleAppsScript.Sheets.Schema.GridRange,
  fillLength: number,
  dimension: 'ROWS' | 'COLUMNS' = 'ROWS',
  useAlternateSeries: boolean = false,
): GoogleAppsScript.Sheets.Schema.Request {
  return {
    autoFill: {
      useAlternateSeries,
      sourceAndDestination: {
        source: sourceRange,
        dimension,
        fillLength,
      },
    },
  }
}
