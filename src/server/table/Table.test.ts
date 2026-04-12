import { Table } from './Table'
import type { CellValue } from './types'

describe('Table', () => {
  describe('sortByColumn', () => {
    const sampleData: CellValue[][] = [
      ['Transaction 1', '2024-03-15', '100'],
      ['Transaction 2', '2024-03-14', '200'],
      ['Transaction 3', '2024-03-15 14:30:00', '300'],
      ['Transaction 4', '2024-03-15 09:00:00', '400'],
    ]

    it('should sort dates using custom comparator', () => {
      const table = new Table([], sampleData)
      const dateColumnIndex = 1
      table.sortByColumn(dateColumnIndex, (a, b) => {
        return new Date(String(b)).getTime() - new Date(String(a)).getTime()
      })

      const result = table.data
      expect(result[0][1]).toBe('2024-03-15 14:30:00')
      expect(result[1][1]).toBe('2024-03-15 09:00:00')
      expect(result[2][1]).toBe('2024-03-15')
      expect(result[3][1]).toBe('2024-03-14')
    })

    it('should handle time differences within the same day', () => {
      const data: CellValue[][] = [
        ['Payment 1', '2024-03-15 08:00:00', '100'],
        ['Payment 2', '2024-03-15 09:30:00', '200'],
        ['Payment 3', '2024-03-15 09:00:00', '300'],
      ]

      const table = new Table([], data)
      table.sortByColumn(1, (a, b) => {
        return new Date(String(b)).getTime() - new Date(String(a)).getTime()
      })

      const result = table.data
      expect(result[0][1]).toBe('2024-03-15 09:30:00')
      expect(result[1][1]).toBe('2024-03-15 09:00:00')
      expect(result[2][1]).toBe('2024-03-15 08:00:00')
    })
  })

  describe('ensureLength', () => {
    it('should pad array with nulls if shorter than target length', () => {
      const input = [1, 2, 3]
      const expected = [1, 2, 3, null, null]
      expect(Table.ensureLength(input, 5)).toEqual(expected)
    })

    it('should truncate array if longer than target length', () => {
      const input = [1, 2, 3, 4, 5]
      const expected = [1, 2, 3]
      expect(Table.ensureLength(input, 3)).toEqual(expected)
    })

    it('should return same array if length matches target', () => {
      const input = [1, 2, 3]
      expect(Table.ensureLength(input, 3)).toEqual(input)
    })
  })

  describe('retrieveColumn', () => {
    it('should retrieve specified column', () => {
      const input: CellValue[][] = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ]
      const table = new Table([], input)
      expect(table.retrieveColumn(1)).toEqual(['b', 'e'])
    })

    it('should handle missing values', () => {
      const input: CellValue[][] = [
        ['a', '', 'c'],
        ['d', '', 'f'],
      ]
      const table = new Table([], input)
      expect(table.retrieveColumn(1)).toEqual(['', ''])
    })
  })

  describe('removeEmptyRows', () => {
    it('should remove rows where all cells are empty', () => {
      const input: CellValue[][] = [
        ['a', 'b'],
        ['', ''],
        ['c', 'd'],
        ['', null],
      ]
      const table = new Table([], input)
      table.removeEmptyRows()
      expect(table.data).toEqual([
        ['a', 'b'],
        ['c', 'd'],
      ])
    })
  })

  describe('accessors', () => {
    it('getRowCount returns correct count', () => {
      expect(new Table([], [['a'], ['b']]).getRowCount()).toBe(2)
    })

    it('getColumnCount returns correct count', () => {
      expect(new Table([], [['a', 'b', 'c']]).getColumnCount()).toBe(3)
    })

    it('isEmpty returns true for empty table', () => {
      expect(new Table([], []).isEmpty()).toBe(true)
    })

    it('isEmpty returns false for non-empty table', () => {
      expect(new Table([], [['a']]).isEmpty()).toBe(false)
    })

    it('getRow returns correct row', () => {
      const table = new Table([], [['a', 'b'], ['c', 'd']])
      expect(table.getRow(1)).toEqual(['c', 'd'])
    })

    it('getRow returns undefined for out-of-bounds', () => {
      const table = new Table([], [['a']])
      expect(table.getRow(5)).toBeUndefined()
    })
  })

  describe('method chaining', () => {
    it('supports chaining multiple operations', () => {
      const table = new Table([], [
        ['a', 'b', 'c'],
        ['', '', ''],
        ['d', 'e', 'f'],
      ])

      table.removeEmptyRows().deleteLastRow()

      expect(table.data).toEqual([
        ['a', 'b', 'c'],
      ])
    })
  })

  describe('static transpose', () => {
    it('should transpose a raw 2D array', () => {
      const input = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ]
      expect(Table.transpose(input)).toEqual([
        ['a', 'd'],
        ['b', 'e'],
        ['c', 'f'],
      ])
    })
  })

  describe('static from', () => {
    it('should extract headers from first row', () => {
      const input = [
        ['Header1', 'Header2'],
        ['v1', 'v2'],
      ]
      const table = Table.from(input)
      expect(table.headers).toEqual(['Header1', 'Header2'])
      expect(table.data).toEqual([['v1', 'v2']])
    })

    it('should throw with empty input', () => {
      expect(() => Table.from([])).toThrow('No header row specified in input data!')
    })
  })
})
