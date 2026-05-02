import { describe, test, expect, it } from 'vitest'
import { categorizeFireTable } from './categorize'
import { FireTable } from '@/common/table/FireTable'

describe('categorizeFireTable', () => {
  it('should return empty category updates when all rows have categories', () => {
    const table = new FireTable([
      // category is at index 9
      ['', '', '', '', '', 'Store', '', '', '', 'Food', '', '', '', '', '', ''],
    ])

    const { rowsCategorized } = categorizeFireTable(table)
    expect(rowsCategorized).toBe(0)
  })

  test('should categorize transactions correctly', () => {
    // FireTable data rows (no header row — FireTable uses FIRE_COLUMNS for structure)
    // FIRE_COLUMNS order: ref, iban, date, amount, balance, contra_account, description, comments, icon, category, label, import_date, hours, disabled, contra_iban, currency
    const fireTable = new FireTable([
      ['1', 'NL91ABNA0417164300', '2023-01-01', '-50', '', 'supermercado', 'Grocery Store', '', '', '', '', '', '', '', '', ''],
      ['2', 'NL91ABNA0417164300', '2023-01-02', '2000', '', 'adidas espana s.a.', 'Salary Payment', '', '', '', '', '', '', '', '', ''],
      ['3', 'NL91ABNA0417164300', '2023-01-03', '-30', '', 'restaurant', 'Restaurant Bill', '', '', '', '', '', '', '', '', ''],
    ])

    const { categoryUpdates, rowsCategorized } = categorizeFireTable(fireTable)

    expect(rowsCategorized).toBe(3)
    expect(categoryUpdates).toHaveLength(3)
    expect(categoryUpdates[0]).toEqual(['Food & Groceries'])
    expect(categoryUpdates[1]).toEqual(['Salary'])
    expect(categoryUpdates[2]).toEqual(['Bars, Restaurants & Clubs'])
  })
})
