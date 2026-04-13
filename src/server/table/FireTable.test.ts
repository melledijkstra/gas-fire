import { N26ImportMock } from '@/fixtures/n26'
import { AccountUtils } from '../accounts/account-utils'
import { Config } from '../config'
import { FireTable } from './FireTable'
import type { RawTable } from '@/common/types'
import { buildFireTableRow } from '@/fixtures/fire-row'

const days = (days: number) => days * 24 * 60 * 60 * 1000

describe('FireTable', () => {
  describe('getFireColumnIndex', () => {
    it('should return correct index for known fire columns', () => {
      expect(FireTable.getFireColumnIndex('ref')).toBe(0)
      expect(FireTable.getFireColumnIndex('iban')).toBe(1)
      expect(FireTable.getFireColumnIndex('date')).toBe(2)
      expect(FireTable.getFireColumnIndex('amount')).toBe(3)
      expect(FireTable.getFireColumnIndex('category')).toBe(9)
    })
  })

  describe('getFireColumn', () => {
    it('should retrieve all values from a fire column', () => {
      // Create a FireTable with data aligned to FIRE_COLUMNS
      // ref, iban, date, amount, balance, contra_account, description, ...
      const table = new FireTable([
        ['ref1', 'NL01', '2024-01-01', 100, '', 'Store A', 'Payment 1', '', '', 'Food', '', '', '', '', '', ''],
        ['ref2', 'NL01', '2024-01-02', 200, '', 'Store B', 'Payment 2', '', '', 'Transport', '', '', '', '', '', ''],
      ])

      const amounts = table.getFireColumn('amount')
      expect(amounts).toEqual([100, 200])

      const categories = table.getFireColumn('category')
      expect(categories).toEqual(['Food', 'Transport'])
    })
  })

  describe('sortByDate', () => {
    it('should sort by date column in descending order', () => {
      const table = new FireTable([
        ['', '', '2024-01-01', 100, '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '2024-01-03', 300, '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '2024-01-02', 200, '', '', '', '', '', '', '', '', '', '', '', ''],
      ])

      table.sortByDate()
      const dates = table.getFireColumn('date')
      expect(dates).toEqual(['2024-01-03', '2024-01-02', '2024-01-01'])
    })
  })

  describe('findDuplicates', () => {
    it('should find duplicates within the specified timespan', () => {
      const table = new FireTable([
        // ref, iban, date, amount, balance, contra_account, ...
        ['1', '', '2023-01-01', '-1.25', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['2', '', '2023-01-01', '-1.25', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['3', '', '2023-01-01', '-30', '', 'Bob', '', '', '', '', '', '', '', '', '', ''],
      ])

      const duplicates = table.findDuplicates(days(2))
      expect(duplicates.getRowCount()).toBe(2)
      expect(duplicates.data[0][0]).toBe('1')
      expect(duplicates.data[1][0]).toBe('2')
    })

    it('should not find duplicates if timespan is exceeded', () => {
      const table = new FireTable([
        ['1', '', '2023-01-01', '-1.25', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['2', '', '2023-01-03', '', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['3', '', '2023-01-01', '', '', 'Bob', '', '', '', '', '', '', '', '', '', ''],
      ])

      const duplicates = table.findDuplicates(1 * 24 * 60 * 60 * 1000)
      expect(duplicates.isEmpty()).toBe(true)
    })

    it('should handle table with less than 2 rows', () => {
      const table = new FireTable([
        ['1', '', '2023-01-01', '', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
      ])
      const duplicates = table.findDuplicates(days(1))
      expect(duplicates.isEmpty()).toBe(true)
    })

    it('should handle an empty table', () => {
      const table = new FireTable([])
      const duplicates = table.findDuplicates(days(1))
      expect(duplicates.data).toEqual([])
    })

    it('should find multiple sets of duplicates', () => {
      // alice1+alice2 are duplicates; bob1+bob2 are duplicates; john rows have different dates
      const alice1 = buildFireTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
      const alice2 = buildFireTableRow({ ref: '2', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
      const john1 = buildFireTableRow({ ref: '3', iban: 'JOHN-IBAN', date: '2023-01-01', amount: '-5' })
      const bob1 = buildFireTableRow({ ref: '4', iban: 'BOB-IBAN', date: '2023-01-01', amount: '100' })
      const bob2 = buildFireTableRow({ ref: '5', iban: 'BOB-IBAN', date: '2023-01-01', amount: '100' })
      const john2 = buildFireTableRow({ ref: '6', iban: 'JOHN-IBAN', date: '2023-01-05', amount: '-5' })
      const bob3 = buildFireTableRow({ ref: '7', iban: 'BOB-IBAN', date: '2023-01-07', amount: '100' })

      const table = new FireTable([alice1, alice2, john1, bob1, bob2, john2, bob3])
      const duplicates = table.findDuplicates(days(1))
      expect(duplicates.data).toEqual([alice1, alice2, bob1, bob2])
    })

    test('should return unique rows when 3 duplicates exist', () => {
      const base = { iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' }
      const row1 = buildFireTableRow({ ref: '1', ...base })
      const row2 = buildFireTableRow({ ref: '2', ...base })
      const row3 = buildFireTableRow({ ref: '3', ...base })

      const table = new FireTable([row1, row2, row3])
      const duplicates = table.findDuplicates(days(1))

      expect(duplicates.data.length).toBe(3)
      const refs = duplicates.data.map(r => r[0])
      expect(new Set(refs).size).toBe(3)
    })

    test('should return unique rows when 3 duplicates exist (identical content)', () => {
      const idRow = buildFireTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })

      const table = new FireTable([idRow, idRow, idRow])
      const duplicates = table.findDuplicates(days(1))

      expect(duplicates.data.length).toBe(3)
    })
  })

  describe('categorize', () => {
    it('should return empty category updates when all rows have categories', () => {
      const table = new FireTable([
        // category is at index 9
        ['', '', '', '', '', 'Store', '', '', '', 'Food', '', '', '', '', '', ''],
      ])

      const { rowsCategorized } = table.categorize()
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

      const { categoryUpdates, rowsCategorized } = fireTable.categorize()

      expect(categoryUpdates).toEqual([
        ['Food & Groceries'],
        ['Salary'],
        ['Bars, Restaurants & Clubs'],
      ])

      expect(rowsCategorized).toBe(3)
    })
  })

  describe('fromCSV', () => {
    it('should return empty result if no rows are provided neither columnMap', () => {
      const result = FireTable.fromAccountSpecification({
        headers: [],
        rows: [],
        config: new Config({
          accountId: 'TestBank',
        }),
      })

      expect(result.getRowCount()).toBe(0)
    })

    it('should return correct shape when no column map is provided', () => {
      const rows: RawTable = [
        ['2022-01-01', '100', 'Checking', 'IBAN1234', 'USD'],
        ['2022-01-02', '200', 'Checking', 'IBAN1234', 'USD'],
      ]

      const config = new Config({
        accountId: 'TestBank',
      })

      const result = FireTable.fromAccountSpecification({
        headers: ['date', 'amount', 'accountName', 'iban', 'currency'],
        rows,
        config,
      })

      expect(result.getRowCount()).toBe(rows.length)
      expect(result.getColumnCount()).toBeGreaterThan(0)
    })

    it('should map empty strings to null instead of keeping them as empty strings', () => {
      const headers = ['Date', 'Amount', 'Description', 'IBAN']
      const rows: RawTable = [['2024-01-01', '100', '', 'NL01BANK001']]

      const config = new Config({
        accountId: 'TestBank',
        columnMap: {
          date: 'Date',
          amount: 'Amount',
          description: 'Description',
          iban: 'IBAN',
        },
      })

      const result = FireTable.fromAccountSpecification({ headers, rows, config })

      const descriptionIndex = FireTable.getFireColumnIndex('description')
      expect(result.data[0][descriptionIndex]).toBe(null)
    })

    it('should correctly import mapped data from input table when column map is provided', () => {
      vi.spyOn(AccountUtils, 'getBankIban').mockReturnValueOnce(
        'NL01BANK0123456789',
      )

      const headers = ['Date', 'Amount', 'Description', 'IBAN']
      const rows: RawTable = [
        ['2024-01-01', '100,00', 'Test payment 1', 'NL02BANK001'],
        ['2024-01-02', '200,00', 'Test payment 2', 'NL02BANK001'],
      ]

      const config = new Config({
        accountId: 'TestBank',
        columnMap: {
          date: 'Date',
          amount: 'Amount',
          description: 'Description',
          iban: 'IBAN',
        },
      })

      const result = FireTable.fromAccountSpecification({ headers, rows, config })
      const data = result.data

      expect(result.getRowCount()).toBe(2)
      expect(data[0][FireTable.getFireColumnIndex('date')]).toStrictEqual(
        new Date(2024, 0, 1),
      )
      expect(data[0][FireTable.getFireColumnIndex('amount')]).toBe(100)
      expect(data[0][FireTable.getFireColumnIndex('description')]).toBe(
        'Test payment 1',
      )
      expect(data[0][FireTable.getFireColumnIndex('iban')]).toBe(
        'NL01BANK0123456789',
      )

      expect(data[1][FireTable.getFireColumnIndex('date')]).toStrictEqual(
        new Date(2024, 0, 2),
      )
      expect(data[1][FireTable.getFireColumnIndex('amount')]).toBe(200)
      expect(data[1][FireTable.getFireColumnIndex('description')]).toBe(
        'Test payment 2',
      )
      expect(data[1][FireTable.getFireColumnIndex('iban')]).toBe(
        'NL01BANK0123456789',
      )
    })

    it('should correctly import when simulating actual bank import', () => {
      vi.spyOn(AccountUtils, 'getBankIban').mockReturnValueOnce(
        'ES12345678910',
      )

      const n26Config = new Config({
        columnMap: {
          ref: '',
          iban: '',
          date: 'Date',
          amount: 'Amount',
          balance: '',
          contra_account: 'Payee',
          description: 'Payment reference',
          comments: '',
          icon: '',
          category: '',
          label: '',
          import_date: '',
          hours: '',
          disabled: '',
          contra_iban: 'AccountNumber',
          currency: 'OriginalCurrency',
        },
        autoFillEnabled: true,
        autoCategorizationEnabled: true,
        autoFillColumnIndices: [1, 5, 9, 13, 14],
        accountId: 'n26',
      })

      const headers = N26ImportMock[0]
      const rows: RawTable = N26ImportMock.slice(1)

      const result = FireTable.fromAccountSpecification({
        config: n26Config,
        headers,
        rows,
      })
      const data = result.data

      expect(result.getRowCount()).toBe(4)
      expect(data[0][FireTable.getFireColumnIndex('date')]).toStrictEqual(
        new Date(2023, 10, 26),
      )
      expect(data[0][FireTable.getFireColumnIndex('amount')]).toBe(-11.63)
      expect(data[0][FireTable.getFireColumnIndex('contra_account')]).toBe(
        'Supermarket X',
      )
      expect(data[0][FireTable.getFireColumnIndex('description')]).toBe(
        'Ticket is attached to the email',
      )
      expect(data[0][FireTable.getFireColumnIndex('iban')]).toBe('ES12345678910')
    })
  })
})
