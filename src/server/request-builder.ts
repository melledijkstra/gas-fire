import type { CellValue } from '@/common/types'

export class SheetsRequestBuilder {
  public requests: GoogleAppsScript.Sheets.Schema.Request[] = []

  insertRows(
    sheetId: number,
    startIndex: number,
    rowCount: number,
    inheritFromBefore: boolean = false,
  ): this {
    const request: GoogleAppsScript.Sheets.Schema.Request = {
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

    this.requests.push(request)

    return this
  }

  insertData(
    sheetId: number,
    data: CellValue[][],
    startRowIndex: number,
    startColumnIndex: number,
    cellDataGenerator: (cell: unknown) => GoogleAppsScript.Sheets.Schema.CellData,
    fields: string = 'userEnteredValue',
  ): this {
    const maxRowLength = data.reduce((max, row) => Math.max(max, row.length), 0)

    const request: GoogleAppsScript.Sheets.Schema.Request = {
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

    this.requests.push(request)

    return this
  }

  autoFill(
    sourceRange: GoogleAppsScript.Sheets.Schema.GridRange,
    fillLength: number,
    dimension: 'ROWS' | 'COLUMNS' = 'ROWS',
    useAlternateSeries: boolean = false,
  ): this {
    const request: GoogleAppsScript.Sheets.Schema.Request = {
      autoFill: {
        useAlternateSeries,
        sourceAndDestination: {
          source: sourceRange,
          dimension,
          fillLength,
        },
      },
    }

    this.requests.push(request)

    return this
  }
}
