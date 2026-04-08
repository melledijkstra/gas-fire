import { getSpreadsheetLocale } from '../utils/spreadsheet'
import { parseDate } from './date'

vi.mock('../utils/spreadsheet')

const mockedGetSpreadsheetLocale = vi.mocked(getSpreadsheetLocale)
mockedGetSpreadsheetLocale.mockReturnValue('en_US')

describe('parseDate', () => {
  test('should parse ISO format', () => {
    expect(parseDate('2024-01-31')).toEqual(new Date(2024, 0, 31))
    expect(parseDate('2026-03-04')).toEqual(new Date(2026, 2, 4))
    // confirm it is midnight in local time, not UTC
    const parsed = parseDate('2026-03-04')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(2)
    expect(parsed.getDate()).toBe(4)
    expect(parsed.getHours()).toBe(0)
    expect(parsed.getMinutes()).toBe(0)
  })

  test('should parse locale-specific format', () => {
    // Assuming en_US locale (MM/dd/yyyy)
    mockedGetSpreadsheetLocale.mockReturnValue('en_US')
    expect(parseDate('01/31/2024')).toEqual(new Date(2024, 0, 31))
    expect(parseDate('03/04/2026')).toEqual(new Date(2026, 2, 4))

    // Assuming European locale (dd/MM/yyyy)
    mockedGetSpreadsheetLocale.mockReturnValue('en_GB')
    expect(parseDate('31/01/2024')).toEqual(new Date(2024, 0, 31))
    expect(parseDate('04/03/2026')).toEqual(new Date(2026, 2, 4))

    // Format with dots
    expect(parseDate('31.01.2024')).toEqual(new Date(2024, 0, 31))
    expect(parseDate('04.03.2026')).toEqual(new Date(2026, 2, 4))
  })

  test('should throw for invalid formats', () => {
    expect(() => parseDate('2024/01/31')).toThrow()
    expect(() => parseDate('31-01-2024')).toThrow()
    expect(() => parseDate('invalid-date')).toThrow()
  })
})
