import { RangeMock, SheetMock, SpreadsheetMock } from '../../test-setup'
import { CATEGORIES_SHEET_NAME } from './config'
import { getCategoryNames } from './helpers'

describe('helpers.ts', () => {
  describe('getCategoryNames', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    test('should return category names when they exist', () => {
      const mockCategories = ['Housing', 'Food', 'Transport']
      SpreadsheetMock.getSheetByName.mockReturnValue(SheetMock as unknown as GoogleAppsScript.Spreadsheet.Sheet)
      SheetMock.getLastColumn.mockReturnValue(3)
      SheetMock.getRange.mockReturnValue(RangeMock as unknown as GoogleAppsScript.Spreadsheet.Range)
      RangeMock.getValues.mockReturnValue([mockCategories])

      const result = getCategoryNames()

      expect(SpreadsheetMock.getSheetByName).toHaveBeenCalledWith(CATEGORIES_SHEET_NAME)
      expect(SheetMock.getRange).toHaveBeenCalledWith(3, 1, 1, 3)
      expect(result).toEqual(mockCategories)
    })

    test('should return an empty array when getValues returns null or undefined', () => {
      SpreadsheetMock.getSheetByName.mockReturnValue(SheetMock as unknown as GoogleAppsScript.Spreadsheet.Sheet)
      SheetMock.getLastColumn.mockReturnValue(1)
      SheetMock.getRange.mockReturnValue(RangeMock as unknown as GoogleAppsScript.Spreadsheet.Range)
      RangeMock.getValues.mockReturnValue(null)

      const result = getCategoryNames()

      expect(result).toEqual([])
    })

    test('should return an empty array when categories are not an array', () => {
      SpreadsheetMock.getSheetByName.mockReturnValue(SheetMock as unknown as GoogleAppsScript.Spreadsheet.Sheet)
      SheetMock.getLastColumn.mockReturnValue(1)
      SheetMock.getRange.mockReturnValue(RangeMock as unknown as GoogleAppsScript.Spreadsheet.Range)
      RangeMock.getValues.mockReturnValue('not-an-array')

      const result = getCategoryNames()

      expect(result).toEqual([])
    })

    test('should throw an error when the categories sheet is not found', () => {
      SpreadsheetMock.getSheetByName.mockReturnValue(null as unknown as GoogleAppsScript.Spreadsheet.Sheet)

      expect(() => getCategoryNames()).toThrow()
    })
  })
})
