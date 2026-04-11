import { categorizeTransactions } from './index'
import { FireTable } from '../table/FireTable'

describe('categorizeTransactions', () => {
  test('should categorize transactions correctly', () => {
    // FireTable data rows (no header row — FireTable uses FIRE_COLUMNS for structure)
    // FIRE_COLUMNS order: ref, iban, date, amount, balance, contra_account, description, comments, icon, category, label, import_date, hours, disabled, contra_iban, currency
    const fireTable = new FireTable([
      ['1', 'NL91ABNA0417164300', '2023-01-01', '-50', '', 'supermercado', 'Grocery Store', '', '', '', '', '', '', '', '', ''],
      ['2', 'NL91ABNA0417164300', '2023-01-02', '2000', '', 'adidas espana s.a.', 'Salary Payment', '', '', '', '', '', '', '', '', ''],
      ['3', 'NL91ABNA0417164300', '2023-01-03', '-30', '', 'restaurant', 'Restaurant Bill', '', '', '', '', '', '', '', '', ''],
    ])

    const { categoryUpdates, rowsCategorized } = categorizeTransactions(fireTable)

    expect(categoryUpdates).toEqual([
      ['Food & Groceries'],
      ['Salary'],
      ['Bars, Restaurants & Clubs'],
    ])

    expect(rowsCategorized).toBe(3)
  })
})
