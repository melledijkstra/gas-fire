import { describe, test, expect, it } from 'vitest'
import { categorizeYMYLTable } from './categorize'
import { YMYLTable } from '@/common/table/YMYLTable'

describe('categorizeYMYLTable', () => {
  it('should return empty category updates when all rows have categories', () => {
    const table = new YMYLTable([
      // category is at index 9
      ['', '', '', '', '', 'Store', '', '', '', 'Food', '', '', '', '', '', ''],
    ])

    const { rowsCategorized } = categorizeYMYLTable(table)
    expect(rowsCategorized).toBe(0)
  })

  test('should categorize transactions correctly', () => {
    // YMYLTable data rows (no header row — YMYLTable uses YMYL_COLUMNS for structure)
    // YMYL_COLUMNS order: ref, iban, date, amount, balance, contra_account, description, comments, icon, category, label, import_date, hours, disabled, contra_iban, currency
    const ymylTable = new YMYLTable([
      ['1', 'NL91ABNA0417164300', '2023-01-01', '-50', '', 'supermercado', 'Grocery Store', '', '', '', '', '', '', '', '', ''],
      ['2', 'NL91ABNA0417164300', '2023-01-02', '2000', '', 'adidas espana s.a.', 'Salary Payment', '', '', '', '', '', '', '', '', ''],
      ['3', 'NL91ABNA0417164300', '2023-01-03', '-30', '', 'restaurant', 'Restaurant Bill', '', '', '', '', '', '', '', '', ''],
    ])

    const { categoryUpdates, rowsCategorized } = categorizeYMYLTable(ymylTable)

    expect(rowsCategorized).toBe(3)
    expect(categoryUpdates).toHaveLength(3)
    expect(categoryUpdates[0]).toEqual(['Food & Groceries'])
    expect(categoryUpdates[1]).toEqual(['Salary'])
    expect(categoryUpdates[2]).toEqual(['Bars, Restaurants & Clubs'])
  })
})
