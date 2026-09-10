import { YMYL_COLUMNS } from '@/common/constants'
import { getRowHash } from '@/common/helpers'
import { YMYLTable } from '@/common/table/YMYLTable'
import { Table } from '@/common/table/Table'
import type { CellValue } from '@/common/types'
import { Config } from '../config'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import type { ImportPipelineContext, PipelineContext, PreviewPipelineContext } from './pipeline'
import {
  applyUserDecisionsStage,
  autoFillPreviewStage,
  duplicateDetectionStage,
  removeEmptyRowsStage,
  sortByDateStage,
  transformToYMYLTableStage,
} from './pipeline'

vi.mock('../spreadsheet/YMYLSheet')

const loadExistingHashesMock = vi.mocked(YMYLSheet.prototype.loadExistingHashes)

describe('Import Pipeline Stages', () => {
  const mockConfig = new Config({
    accountId: 'test-bank',
    columnMap: {
      date: 'Date',
      amount: 'Amount',
      description: 'Desc',
    },
  })

  const createContext = (overrides: Partial<PipelineContext> = {}): PipelineContext => ({
    config: mockConfig,
    ...overrides,
  })

  describe('removeEmptyRowsStage', () => {
    it('should remove empty rows from a Table', () => {
      const table = new Table<CellValue>(['Col1'], [['Data'], [''], [null]])
      const result = removeEmptyRowsStage(table, createContext())
      expect(result.getRowCount()).toBe(1)
      expect(result.data[0][0]).toBe('Data')
    })
  })

  describe('transformToYMYLTableStage', () => {
    it('should transform a Table to a YMYLTable using config', () => {
      const table = new Table(['Date', 'Amount', 'Desc'], [['2023-01-01', '10.50', 'Test']])
      const result = transformToYMYLTableStage(table, createContext())
      expect(result).toBeInstanceOf(YMYLTable)
      expect(result.getRowCount()).toBe(1)

      const amountIndex = YMYLTable.getYMYLColumnIndex('amount')
      expect(result.data[0][amountIndex]).toBe(10.5)
    })

    it('should throw if no headers are present', () => {
      const table = new Table([], [['data']])
      expect(() => transformToYMYLTableStage(table, createContext())).toThrow()
    })
  })

  describe('sortByDateStage', () => {
    it('should sort rows by date descending', () => {
      const dateIndex = YMYLTable.getYMYLColumnIndex('date')
      const data = new Array(2).fill(null).map(() => new Array(YMYL_COLUMNS.length).fill(null))

      data[0][dateIndex] = new Date('2023-01-01')
      data[1][dateIndex] = new Date('2023-01-05')

      const ymylTable = new YMYLTable(data)
      const result = sortByDateStage(ymylTable, createContext())

      expect(result.data[0][dateIndex]).toEqual(new Date('2023-01-05'))
      expect(result.data[1][dateIndex]).toEqual(new Date('2023-01-01'))
    })
  })

  describe('duplicateDetectionStage', () => {
    it('should mark duplicates based on existing hashes', () => {
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
      const context: PreviewPipelineContext = {
        ...createContext(),
        duplicateHashes: new Set<string>(),
      }

      loadExistingHashesMock.mockReturnValue(new Set([hash]))

      const result = duplicateDetectionStage(ymylTable, context)

      expect(result.data.length).toBe(2)
      expect(context.duplicateHashes.has(hash)).toBe(true)
    })
  })

  describe('autoFillPreviewStage', () => {
    it('should add (auto-filled) to empty cells in configured columns', () => {
      const config = new Config({
        accountId: 'test',
        autoFillEnabled: true,
        autoFillColumnIndices: [5], // 1-based, so index 4
      })

      const data = [['val1', 'val2', 'val3', 'val4', '']]
      const ymylTable = new YMYLTable(data)
      const context = createContext({ config })

      autoFillPreviewStage(ymylTable, context)

      expect(ymylTable.data[0][4]).toBe('(auto-filled)')
    })

    it('should not modify non-empty cells', () => {
      const config = new Config({
        accountId: 'test',
        autoFillEnabled: true,
        autoFillColumnIndices: [1],
      })

      const data = [['original']]
      const ymylTable = new YMYLTable(data)
      const context = createContext({ config })

      autoFillPreviewStage(ymylTable, context)

      expect(ymylTable.data[0][0]).toBe('original')
    })
  })

  describe('applyUserDecisionsStage', () => {
    it('should filter out rows marked as skip', () => {
      const data = new Array(2).fill(null).map(() => new Array(YMYL_COLUMNS.length).fill(null))
      const dateIdx = YMYLTable.getYMYLColumnIndex('date')
      const ibanIdx = YMYLTable.getYMYLColumnIndex('iban')

      data[0][dateIdx] = new Date('2023-01-01')
      data[0][ibanIdx] = 'IBAN1'
      data[1][dateIdx] = new Date('2023-01-02')
      data[1][ibanIdx] = 'IBAN2'

      const hash1 = getRowHash(data[0])

      const ymylTable = new YMYLTable(data)
      const context: ImportPipelineContext = {
        ...createContext(),
        userDecisions: new Map([[hash1, 'skip']]),
      }

      const result = applyUserDecisionsStage(ymylTable, context)

      expect(result.getRowCount()).toBe(1)
      expect(result.data[0][dateIdx]).toEqual(new Date('2023-01-02'))
    })
  })
})
