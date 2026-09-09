import { buildYMYLTableRow } from '@/fixtures/YMYL-row'
import { YMYLTable } from './YMYLTable'

const days = (days: number) => days * 24 * 60 * 60 * 1000

describe('YMYLTable', () => {
  describe('getYMYLColumnIndex', () => {
    it('should return correct index for known YMYL columns', () => {
      expect(YMYLTable.getYMYLColumnIndex('ref')).toBe(0)
      expect(YMYLTable.getYMYLColumnIndex('iban')).toBe(1)
      expect(YMYLTable.getYMYLColumnIndex('date')).toBe(2)
      expect(YMYLTable.getYMYLColumnIndex('amount')).toBe(3)
      expect(YMYLTable.getYMYLColumnIndex('category')).toBe(9)
    })
  })

  describe('getYMYLColumn', () => {
    it('should retrieve all values from a YMYL column', () => {
      // Create a YMYLTable with data aligned to YMYL_COLUMNS
      // ref, iban, date, amount, balance, contra_account, description, ...
      const table = new YMYLTable([
        ['ref1', 'NL01', '2024-01-01', 100, '', 'Store A', 'Payment 1', '', '', 'Food', '', '', '', '', '', ''],
        ['ref2', 'NL01', '2024-01-02', 200, '', 'Store B', 'Payment 2', '', '', 'Transport', '', '', '', '', '', ''],
      ])

      const amounts = table.getYMYLColumn('amount')
      expect(amounts).toEqual([100, 200])

      const categories = table.getYMYLColumn('category')
      expect(categories).toEqual(['Food', 'Transport'])
    })
  })

  describe('sortByDate', () => {
    it('should sort by date column in descending order', () => {
      const table = new YMYLTable([
        ['', '', '2024-01-01', 100, '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '2024-01-03', 300, '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '2024-01-02', 200, '', '', '', '', '', '', '', '', '', '', '', ''],
      ])

      table.sortByDate()
      const dates = table.getYMYLColumn('date')
      expect(dates).toEqual(['2024-01-03', '2024-01-02', '2024-01-01'])
    })
  })

  describe('findDuplicates', () => {
    it('should find duplicates within the specified timespan', () => {
      const table = new YMYLTable([
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
      const table = new YMYLTable([
        ['1', '', '2023-01-01', '-1.25', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['2', '', '2023-01-03', '', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['3', '', '2023-01-01', '', '', 'Bob', '', '', '', '', '', '', '', '', '', ''],
      ])

      const duplicates = table.findDuplicates(1 * 24 * 60 * 60 * 1000)
      expect(duplicates.isEmpty()).toBe(true)
    })

    it('should handle table with less than 2 rows', () => {
      const table = new YMYLTable([
        ['1', '', '2023-01-01', '', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
      ])
      const duplicates = table.findDuplicates(days(1))
      expect(duplicates.isEmpty()).toBe(true)
    })

    it('should handle an empty table', () => {
      const table = new YMYLTable([])
      const duplicates = table.findDuplicates(days(1))
      expect(duplicates.data).toEqual([])
    })

    it('should find multiple sets of duplicates', () => {
      // alice1+alice2 are duplicates; bob1+bob2 are duplicates; john rows have different dates
      const alice1 = buildYMYLTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
      const alice2 = buildYMYLTableRow({ ref: '2', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
      const john1 = buildYMYLTableRow({ ref: '3', iban: 'JOHN-IBAN', date: '2023-01-01', amount: '-5' })
      const bob1 = buildYMYLTableRow({ ref: '4', iban: 'BOB-IBAN', date: '2023-01-01', amount: '100' })
      const bob2 = buildYMYLTableRow({ ref: '5', iban: 'BOB-IBAN', date: '2023-01-01', amount: '100' })
      const john2 = buildYMYLTableRow({ ref: '6', iban: 'JOHN-IBAN', date: '2023-01-05', amount: '-5' })
      const bob3 = buildYMYLTableRow({ ref: '7', iban: 'BOB-IBAN', date: '2023-01-07', amount: '100' })

      const table = new YMYLTable([alice1, alice2, john1, bob1, bob2, john2, bob3])
      const duplicates = table.findDuplicates(days(1))
      expect(duplicates.data).toEqual([alice1, alice2, bob1, bob2])
    })

    test('should return unique rows when 3 duplicates exist', () => {
      const base = { iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' }
      const row1 = buildYMYLTableRow({ ref: '1', ...base })
      const row2 = buildYMYLTableRow({ ref: '2', ...base })
      const row3 = buildYMYLTableRow({ ref: '3', ...base })

      const table = new YMYLTable([row1, row2, row3])
      const duplicates = table.findDuplicates(days(1))

      expect(duplicates.data.length).toBe(3)
      const refs = duplicates.data.map(r => r[0])
      expect(new Set(refs).size).toBe(3)
    })

    test('should return unique rows when 3 duplicates exist (identical content)', () => {
      const idRow = buildYMYLTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })

      const table = new YMYLTable([idRow, idRow, idRow])
      const duplicates = table.findDuplicates(days(1))

      expect(duplicates.data.length).toBe(3)
    })
  })
})
