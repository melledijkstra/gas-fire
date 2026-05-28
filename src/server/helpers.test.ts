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
      SpreadsheetMock.getSheetByName.mockReturnValueOnce(SheetMock as any)
      SheetMock.getLastColumn.mockReturnValueOnce(3)
      SheetMock.getRange.mockReturnValueOnce(RangeMock as any)
      RangeMock.getValues.mockReturnValueOnce([mockCategories])

      const result = getCategoryNames()

      expect(SpreadsheetMock.getSheetByName).toHaveBeenCalledWith(CATEGORIES_SHEET_NAME)
      expect(SheetMock.getRange).toHaveBeenCalledWith(3, 1, 1, 3)
      expect(result).toEqual(mockCategories)
    })

    test('should return an empty array when getValues returns null or undefined', () => {
      SpreadsheetMock.getSheetByName.mockReturnValueOnce(SheetMock as any)
      SheetMock.getLastColumn.mockReturnValueOnce(1)
      SheetMock.getRange.mockReturnValueOnce(RangeMock as any)
      RangeMock.getValues.mockReturnValueOnce(null)

      const result = getCategoryNames()

      expect(result).toEqual([])
    })

    test('should return an empty array when categories are not an array', () => {
      SpreadsheetMock.getSheetByName.mockReturnValueOnce(SheetMock as any)
      SheetMock.getLastColumn.mockReturnValueOnce(1)
      SpreadsheetMock.getRange.mockReturnValueOnce(RangeMock as any)
      RangeMock.getValues.mockReturnValueOnce('not-an-array')

      const result = getCategoryNames()

      expect(result).toEqual([])
    })

    test('should throw an error when the categories sheet is not found', () => {
      SpreadsheetMock.getSheetByName.mockReturnValueOnce(null as any)

      expect(() => getCategoryNames()).toThrow()
    })
  })
})
