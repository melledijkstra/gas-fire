import { YMYL_COLUMNS } from '@/common/constants'
import { getRowHash } from '@/common/helpers'
import { YMYLTable } from '@/common/table/YMYLTable'
import { Table } from '@/common/table/Table'
import type { CellValue } from '@/common/types'
import { Config } from '../config'
import {
  applyUserDecisions,
  autoFillPreview,
  detectDuplicates,
  filterOutExcluded,
  removeEmptyRows,
  transformToYMYLTable,
} from './pipeline'

describe('import pipeline transformation helpers', () => {
  const mockConfig = new Config({
    accountId: 'test-bank',
    columnMap: {
      date: 'Date',
      amount: 'Amount',
      description: 'Desc',
    },
  })

  describe('removeEmptyRows', () => {
    it('should remove empty rows from a Table', () => {
      const table = new Table<CellValue>(['Col1'], [['Data'], [''], [null]])
      const result = removeEmptyRows(table)
      expect(result.getRowCount()).toBe(1)
      expect(result.data[0][0]).toBe('Data')
    })
  })

  describe('transformToYMYLTable', () => {
    it('should transform a Table to a YMYLTable using config', () => {
      const table = new Table(['Date', 'Amount', 'Desc'], [['2023-01-01', '10.50', 'Test']])
      const result = transformToYMYLTable(table, mockConfig)
      expect(result).toBeInstanceOf(YMYLTable)
      expect(result.getRowCount()).toBe(1)

      const amountIndex = YMYLTable.getYMYLColumnIndex('amount')
      expect(result.data[0][amountIndex]).toBe(10.5)
    })

    it('should throw if no headers are present', () => {
      const table = new Table([], [['data']])
      expect(() => transformToYMYLTable(table, mockConfig)).toThrow()
    })
  })

  describe('detectDuplicates', () => {
    it('should detect duplicate rows based on existing hashes', () => {
      const data = new Array(2).fill(null).map(() => new Array(YMYL_COLUMNS.length).fill(null))

      const dateIdx = YMYLTable.getYMYLColumnIndex('date')
      const amountIdx = YMYLTable.getYMYLColumnIndex('amount')
      const ibanIdx = YMYLTable.getYMYLColumnIndex('iban')

      const date = new Date('2023-01-01')
      data[0][dateIdx] = date
      data[0][amountIdx] = 100
      data[0][ibanIdx] = 'TEST-IBAN'

      data[1][dateIdx] = date
      data[1][amountIdx] = 100
      data[1][ibanIdx] = 'TEST-IBAN'

      const hash = getRowHash(data[0])
      const ymylTable = new YMYLTable(data)
      const existingHashes = new Set([hash])

      const duplicates = detectDuplicates(ymylTable, existingHashes)

      expect(duplicates.has(hash)).toBe(true)
      expect(duplicates.size).toBe(1)
    })
  })

  describe('autoFillPreview', () => {
    it('should add (auto-filled) to empty cells in configured columns', () => {
      const data = [['val1', 'val2', 'val3', 'val4', '']]
      const ymylTable = new YMYLTable(data)

      autoFillPreview(ymylTable, [5]) // 1-based, so index 4

      expect(ymylTable.data[0][4]).toBe('(auto-filled)')
    })

    it('should not modify non-empty cells', () => {
      const data = [['original']]
      const ymylTable = new YMYLTable(data)

      autoFillPreview(ymylTable, [1])

      expect(ymylTable.data[0][0]).toBe('original')
    })
  })

  describe('applyUserDecisions', () => {
    it('should filter out rows marked as skip using Map', () => {
      const data = new Array(2).fill(null).map(() => new Array(YMYL_COLUMNS.length).fill(null))
      const dateIdx = YMYLTable.getYMYLColumnIndex('date')
      const ibanIdx = YMYLTable.getYMYLColumnIndex('iban')

      data[0][dateIdx] = new Date('2023-01-01')
      data[0][ibanIdx] = 'IBAN1'
      data[1][dateIdx] = new Date('2023-01-02')
      data[1][ibanIdx] = 'IBAN2'

      const hash1 = getRowHash(data[0])
      const ymylTable = new YMYLTable(data)

      const result = applyUserDecisions(ymylTable, new Map([[hash1, 'skip']]))

      expect(result.getRowCount()).toBe(1)
      expect(result.data[0][dateIdx]).toEqual(new Date('2023-01-02'))
    })

    it('should filter out rows marked as skip using Record', () => {
      const data = new Array(2).fill(null).map(() => new Array(YMYL_COLUMNS.length).fill(null))
      const dateIdx = YMYLTable.getYMYLColumnIndex('date')
      const ibanIdx = YMYLTable.getYMYLColumnIndex('iban')

      data[0][dateIdx] = new Date('2023-01-01')
      data[0][ibanIdx] = 'IBAN1'
      data[1][dateIdx] = new Date('2023-01-02')
      data[1][ibanIdx] = 'IBAN2'

      const hash1 = getRowHash(data[0])
      const ymylTable = new YMYLTable(data)

      const result = applyUserDecisions(ymylTable, { [hash1]: 'skip' })

      expect(result.getRowCount()).toBe(1)
      expect(result.data[0][dateIdx]).toEqual(new Date('2023-01-02'))
    })
  })

  describe('filterOutExcluded', () => {
    it('should remove rows matching excluded hashes', () => {
      const data = new Array(2).fill(null).map(() => new Array(YMYL_COLUMNS.length).fill(null))
      const ibanIdx = YMYLTable.getYMYLColumnIndex('iban')

      data[0][ibanIdx] = 'IBAN1'
      data[1][ibanIdx] = 'IBAN2'

      const hash0 = getRowHash(data[0])
      const ymylTable = new YMYLTable(data)

      const result = filterOutExcluded(ymylTable, new Set([hash0]))

      expect(result.getRowCount()).toBe(1)
      expect(result.data[0][ibanIdx]).toBe('IBAN2')
    })
  })
})
