import { Table } from '../table/Table'
import { FireTable } from '../table/FireTable'
import { Config } from '../config'
import {
  removeEmptyRowsStage,
  transformToFireTableStage,
  sortByDateStage,
  duplicateDetectionStage,
  autoFillPreviewStage,
  applyUserDecisionsStage,
} from './pipeline'
import type { ImportPipelineContext, PipelineContext, PreviewPipelineContext } from './pipeline'
import { FIRE_COLUMNS } from '@/common/constants'
import { getRowHash } from '@/common/helpers'
import type { CellValue } from '@/common/types'
import { FireSheet } from '../spreadsheet/FireSheet'

vi.mock('../spreadsheet/FireSheet')

const loadExistingHashesMock = vi.mocked(FireSheet.prototype.loadExistingHashes)

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

  describe('transformToFireTableStage', () => {
    it('should transform a Table to a FireTable using config', () => {
      const table = new Table(['Date', 'Amount', 'Desc'], [['2023-01-01', '10.50', 'Test']])
      const result = transformToFireTableStage(table, createContext())
      expect(result).toBeInstanceOf(FireTable)
      expect(result.getRowCount()).toBe(1)

      const amountIndex = FireTable.getFireColumnIndex('amount')
      expect(result.data[0][amountIndex]).toBe(10.5)
    })

    it('should throw if no headers are present', () => {
      const table = new Table([], [['data']])
      expect(() => transformToFireTableStage(table, createContext())).toThrow()
    })
  })

  describe('sortByDateStage', () => {
    it('should sort rows by date descending', () => {
      const dateIndex = FireTable.getFireColumnIndex('date')
      const data = new Array(2).fill(null).map(() => new Array(FIRE_COLUMNS.length).fill(null))

      data[0][dateIndex] = new Date('2023-01-01')
      data[1][dateIndex] = new Date('2023-01-05')

      const fireTable = new FireTable(data)
      const result = sortByDateStage(fireTable, createContext())

      expect(result.data[0][dateIndex]).toEqual(new Date('2023-01-05'))
      expect(result.data[1][dateIndex]).toEqual(new Date('2023-01-01'))
    })
  })

  describe('duplicateDetectionStage', () => {
    it('should mark duplicates based on existing hashes', () => {
      const data = new Array(2).fill(null).map(() => new Array(FIRE_COLUMNS.length).fill(null))

      const dateIdx = FireTable.getFireColumnIndex('date')
      const amountIdx = FireTable.getFireColumnIndex('amount')
      const ibanIdx = FireTable.getFireColumnIndex('iban')

      const date = new Date('2023-01-01')
      data[0][dateIdx] = date
      data[0][amountIdx] = 100
      data[0][ibanIdx] = 'TEST-IBAN'

      data[1][dateIdx] = date
      data[1][amountIdx] = 100
      data[1][ibanIdx] = 'TEST-IBAN'

      const hash = getRowHash(data[0])

      const fireTable = new FireTable(data)
      const context: PreviewPipelineContext = {
        ...createContext(),
        duplicateHashes: new Set<string>(),
        removedHashes: new Set<string>(),
      }

      loadExistingHashesMock.mockReturnValue(new Set([hash]))

      const result = duplicateDetectionStage(fireTable, context)

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
      const fireTable = new FireTable(data)
      const context = createContext({ config })

      autoFillPreviewStage(fireTable, context)

      expect(fireTable.data[0][4]).toBe('(auto-filled)')
    })

    it('should not modify non-empty cells', () => {
      const config = new Config({
        accountId: 'test',
        autoFillEnabled: true,
        autoFillColumnIndices: [1],
      })

      const data = [['original']]
      const fireTable = new FireTable(data)
      const context = createContext({ config })

      autoFillPreviewStage(fireTable, context)

      expect(fireTable.data[0][0]).toBe('original')
    })
  })

  describe('applyUserDecisionsStage', () => {
    it('should filter out rows marked as skip', () => {
      const data = new Array(2).fill(null).map(() => new Array(FIRE_COLUMNS.length).fill(null))
      const dateIdx = FireTable.getFireColumnIndex('date')
      const ibanIdx = FireTable.getFireColumnIndex('iban')

      data[0][dateIdx] = new Date('2023-01-01')
      data[0][ibanIdx] = 'IBAN1'
      data[1][dateIdx] = new Date('2023-01-02')
      data[1][ibanIdx] = 'IBAN2'

      const hash1 = getRowHash(data[0])

      const fireTable = new FireTable(data)
      const context: ImportPipelineContext = {
        ...createContext(),
        userDecisions: new Map([[hash1, 'skip']]),
      }

      const result = applyUserDecisionsStage(fireTable, context)

      expect(result.getRowCount()).toBe(1)
      expect(result.data[0][dateIdx]).toEqual(new Date('2023-01-02'))
    })
  })
})
