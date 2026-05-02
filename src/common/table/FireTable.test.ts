import { FireTable } from './FireTable'
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
})
