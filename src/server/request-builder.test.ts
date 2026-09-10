import type { CellValue } from '@/common/types'
import { describe, expect, it } from 'vitest'
import { buildInsertRowsRequest, buildInsertDataRequest, buildAutoFillRequest } from './request-builder'

describe('request-builder', () => {
  describe('buildInsertRowsRequest', () => {
    it('should build a request to insert rows with default inheritance', () => {
      const request = buildInsertRowsRequest(123, 5, 10)

      expect(request).toEqual({
        insertDimension: {
          range: {
            sheetId: 123,
            dimension: 'ROWS',
            startIndex: 5,
            endIndex: 15,
          },
          inheritFromBefore: false,
        },
      })
    })

    it('should build a request to insert rows with inheritFromBefore = true', () => {
      const request = buildInsertRowsRequest(123, 5, 10, true)

      expect(request).toEqual({
        insertDimension: {
          range: {
            sheetId: 123,
            dimension: 'ROWS',
            startIndex: 5,
            endIndex: 15,
          },
          inheritFromBefore: true,
        },
      })
    })
  })

  describe('buildInsertDataRequest', () => {
    it('should build an updateCells request with given data and cell generator', () => {
      const data = [
        ['A1', 'B1'],
        ['A2', 'B2'],
      ]

      const generator = (cell: unknown): GoogleAppsScript.Sheets.Schema.CellData => ({
        userEnteredValue: { stringValue: String(cell) },
      })

      const request = buildInsertDataRequest(123, data, 10, 5, generator)

      expect(request).toEqual({
        updateCells: {
          rows: [
            { values: [{ userEnteredValue: { stringValue: 'A1' } }, { userEnteredValue: { stringValue: 'B1' } }] },
            { values: [{ userEnteredValue: { stringValue: 'A2' } }, { userEnteredValue: { stringValue: 'B2' } }] },
          ],
          fields: 'userEnteredValue',
          range: {
            sheetId: 123,
            startRowIndex: 10,
            endRowIndex: 12,
            startColumnIndex: 5,
            endColumnIndex: 7,
          },
        },
      })
    })

    it('should build an updateCells request with custom fields', () => {
      const data = [['A1']]
      const generator = (cell: unknown): GoogleAppsScript.Sheets.Schema.CellData => ({
        userEnteredValue: { stringValue: String(cell) },
      })

      const request = buildInsertDataRequest(123, data, 10, 5, generator, 'userEnteredValue,userEnteredFormat')

      expect(request?.updateCells?.fields).toBe('userEnteredValue,userEnteredFormat')
    })

    it('should handle an empty data array correctly', () => {
      const data: CellValue[][] = []
      const generator = (cell: unknown): GoogleAppsScript.Sheets.Schema.CellData => ({
        userEnteredValue: { stringValue: String(cell) },
      })

      const request = buildInsertDataRequest(123, data, 10, 5, generator)

      expect(request).toEqual({
        updateCells: {
          rows: [],
          fields: 'userEnteredValue',
          range: {
            sheetId: 123,
            startRowIndex: 10,
            endRowIndex: 10,
            startColumnIndex: 5,
            endColumnIndex: 5,
          },
        },
      })
    })

    it('should handle data arrays with uneven row lengths safely based on the longest row', () => {
      const data: CellValue[][] = [
        ['A1'],
        ['A2', 'B2', 'C2'],
        ['A3', 'B3'],
      ]

      const generator = (cell: unknown): GoogleAppsScript.Sheets.Schema.CellData => ({
        userEnteredValue: { stringValue: String(cell) },
      })

      const request = buildInsertDataRequest(123, data, 10, 5, generator)

      expect(request?.updateCells?.range?.endColumnIndex).toBe(8) // 5 + 3
    })
  })

  describe('buildAutoFillRequest', () => {
    it('should build an autoFill request with default dimension and alternate series flag', () => {
      const sourceRange = {
        sheetId: 123,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 1,
        endColumnIndex: 2,
      }

      const request = buildAutoFillRequest(sourceRange, 5)

      expect(request).toEqual({
        autoFill: {
          useAlternateSeries: false,
          sourceAndDestination: {
            source: sourceRange,
            dimension: 'ROWS',
            fillLength: 5,
          },
        },
      })
    })

    it('should build an autoFill request with custom dimension and alternate series flag', () => {
      const sourceRange = {
        sheetId: 123,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 1,
        endColumnIndex: 2,
      }

      const request = buildAutoFillRequest(sourceRange, 5, 'COLUMNS', true)

      expect(request).toEqual({
        autoFill: {
          useAlternateSeries: true,
          sourceAndDestination: {
            source: sourceRange,
            dimension: 'COLUMNS',
            fillLength: 5,
          },
        },
      })
    })
  })
})
