import { getRowHash, slugify } from '@/common/helpers'
import { Logger } from '@/common/logger'
import { YMYLTable } from '@/common/table/YMYLTable'
import type { RawTable } from '@/common/types'
import bankOfAmericaCSV from '@/fixtures/commonwealth-bank.csv?raw'
import { N26ImportMock } from '@/fixtures/n26'
import { raboImportMock } from '@/fixtures/rabobank'
import { fakeTestBankImportData } from '@/fixtures/test-bank'
import Papa from 'papaparse'
import {
  SheetMock,
  SpreadsheetMock,
} from '../../../test-setup'
import { AccountUtils } from '../accounts/account-utils'
import { Config } from '../config'
import { RuleProcessor } from '../rule-engine/rule-processor'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import { removeFilterCriteria } from '../spreadsheet/spreadsheet'
import { YMYLTableFactory } from './YMYL-table-factory'
import {
  importPipeline,
  previewPipeline,
} from './rpc'

vi.mock('../globals', () => ({
  YMYLSpreadsheet: SpreadsheetMock,
  FireSpreadsheet: SpreadsheetMock,
  getSourceSheet: vi.fn(() => SheetMock),
  getImportRulesSheet: vi.fn(() => undefined),
}))

vi.mock('../spreadsheet/YMYLSheet')
vi.mock('../spreadsheet/spreadsheet')

vi.mock('../accounts/rpc', () => ({
  getBankAccountOptionsCached: vi.fn(() => ({
    success: true,
    data: {
      [slugify(BANK_ID)]: 'DB123456789',
      anotherbank: 'BANK123456789',
    },
  })),
}))

const getLocaleMock = vi.mocked(YMYLSheet.getLocale)
const removeFilterCriteriaMock = vi.mocked(removeFilterCriteria)
removeFilterCriteriaMock.mockReturnValue(true)

const configSpy = vi.spyOn(Config, 'getAccountConfiguration')
const importDataSpy = vi.spyOn(YMYLSheet.prototype, 'importData')
const applyPostTransformRulesSpy = vi.spyOn(RuleProcessor.prototype, 'applyPostTransformRules')

const BANK_ID = 'TestBank'

describe('RPC: Import Functions', () => {
  beforeAll(() => {
    configSpy.mockReturnValue(new Config({
      accountId: BANK_ID,
      columnMap: {
        amount: 'TransactionAmount',
      },
    }))
  })

  beforeEach(() => {
    applyPostTransformRulesSpy.mockReturnValue({
      appliedRules: [],
      rowsAffectedCount: 0,
      warnings: [],
      excludedIndices: new Set(),
      excludedByRule: new Map(),
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('previewPipeline', () => {
    let getBalanceSpy: ReturnType<typeof vi.spyOn>
    let ymylSheetSpy: ReturnType<typeof vi.spyOn>
    let loadExistingHashesSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      getBalanceSpy = vi.spyOn(AccountUtils, 'getBalance').mockReturnValue(302.8)
      ymylSheetSpy = vi.spyOn(YMYLSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new YMYLTable([]))
      loadExistingHashesSpy = vi.spyOn(YMYLSheet.prototype, 'loadExistingHashes').mockReturnValue(new Set())
    })

    afterEach(() => {
      getBalanceSpy.mockRestore()
      ymylSheetSpy.mockRestore()
      loadExistingHashesSpy.mockRestore()
    })

    test('is able to handle table without any useful data and should return the current balance', () => {
      const table: RawTable = [
        ['TransactionAmount', 'TransactionDate', 'Payee'],
        ['', '', ''],
      ]
      const response = previewPipeline(
        table,
        BANK_ID,
      )

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data?.newBalance).toBeCloseTo(302.8, 2)
        expect(response.data?.duplicateHashes?.length).toBe(0)
      }
    })

    test('is able to calculate new balance when there is useful data in the amounts column', () => {
      getBalanceSpy.mockReturnValue(305.85)

      const response = previewPipeline(
        structuredClone(fakeTestBankImportData),
        BANK_ID,
      )

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data?.newBalance).toBeCloseTo(358.55, 2)
      }
    })

    test('is able to calculate removed hashed', () => {
      const table: RawTable = [
        ['TransactionAmount', 'TransactionDate', 'Payee'],
        ['-25.6', '2016-01-23', 'Test Payee 1'], // index 0 in YMYLTable
        ['58.3', '2015-05-21', 'Test Payee 2'], // index 1 in YMYLTable - remove
        ['20', '2015-05-20', 'Test Payee 3'], // index 2 in YMYLTable
        ['73.2', '2015-05-22', 'Test Payee 4'], // index 3 in YMYLTable - remove
      ]

      applyPostTransformRulesSpy.mockReturnValue({
        appliedRules: [],
        rowsAffectedCount: 2,
        warnings: [],
        excludedIndices: new Set([1, 3]),
        excludedByRule: new Map([[1, 'Rule 2'], [3, 'Rule 4']]),
      })

      const response = previewPipeline(
        table,
        BANK_ID,
      )

      expect(response.success).toBe(true)
      if (response.success) {
        // Since we are mocking applyPostTransformRules, it uses YMYLTable rows for hashing.
        // We need to calculate the hashes of the transformed rows to match what the pipeline will produce.
        const ymylTable = YMYLTableFactory.fromAccountSpecification({
          headers: table[0],
          rows: table.slice(1),
          config: Config.getAccountConfiguration(BANK_ID),
        })
        const hash2 = getRowHash(ymylTable.data[1])
        const hash4 = getRowHash(ymylTable.data[3])

        expect(response.data?.ruleEngine?.removedHashes).toEqual([hash2, hash4])
      }
    })
  })

  describe('importPipeline', () => {
    beforeAll(() => {
      Logger.disable()
    })

    let ymylSheetSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      ymylSheetSpy = vi.spyOn(YMYLSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new YMYLTable([]))
    })

    afterEach(() => {
      ymylSheetSpy.mockRestore()
    })

    test('handles empty import', () => {
      const result = importPipeline([], BANK_ID)

      expect(importDataSpy).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No header row specified in input data!')
      }
    })

    test('handles empty input data', () => {
      const result = importPipeline([
        // first row is header row, meaning that there are actually no rows to actually import
        ['header1', 'header2', 'header3', 'header4'],
      ], BANK_ID)

      expect(importDataSpy).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No rows to import, check your import data, rules, row decisions or configuration!')
      }
    })

    test('removes filters if any are set', () => {
      removeFilterCriteriaMock.mockReturnValue(true)

      importPipeline([], 'TestBank')

      expect(YMYLSheet.prototype.getFilter).toHaveBeenCalled()
    })

    test('is able to handle N26 import', () => {
      const fakeN26Config = new Config({
        accountId: 'N26',
        columnMap: {
          amount: 'Amount',
          date: 'Date',
          contra_account: 'Payee',
          contra_iban: 'Account number',
          currency: 'Type Foreign Currency',
          description: 'Payment reference',
        },
      })
      configSpy.mockReturnValueOnce(fakeN26Config)

      const result = importPipeline(N26ImportMock, 'N26')

      expect(importDataSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.message).toBe('imported 4 rows!')
      }
    })

    test('is able to handle rabobank import', () => {
      const fakeRabobankConfig = new Config({
        accountId: 'rabobank',
      })
      configSpy.mockReturnValueOnce(fakeRabobankConfig)

      const result = importPipeline(raboImportMock, 'rabobank')

      expect(importDataSpy).toHaveBeenCalled()
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.message).toBe('imported 1 rows!')
      }
    })

    test('is able to handle bank of america', () => {
      getLocaleMock.mockReturnValueOnce('en_US')

      const bankOfAmericaConfig = new Config({
        accountId: 'bank-of-america',
        columnMap: {
          amount: 'Amount',
          date: 'Date',
          description: 'Description',
        },
      })

      configSpy.mockReturnValue(bankOfAmericaConfig)

      const { data } = Papa.parse(bankOfAmericaCSV)
      const result = importPipeline(data as RawTable, 'bank-of-america')

      expect(importDataSpy).toHaveBeenCalled()
      const [ymylTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
      expect(ymylTable.data).toEqual(expect.arrayContaining([
        expect.arrayContaining([new Date(2023, 8, 12), -100, 'Utility Bill Payment']),
      ]))
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.message).toBe('imported 5 rows!')
      }
    })

    test('sorts by date before importing', () => {
      const testBankConfig = new Config({
        accountId: BANK_ID,
        columnMap: {
          amount: 'TransactionAmount',
          date: 'TransactionDate',
        },
      })

      configSpy.mockReturnValue(testBankConfig)

      importPipeline(fakeTestBankImportData, BANK_ID)

      expect(importDataSpy).toHaveBeenCalled()
      const [ymylTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
      expect(ymylTable.data).toEqual([
        expect.arrayContaining([new Date(2016, 0, 23), -25.6]),
        expect.arrayContaining([new Date(2015, 4, 21), 58.3]),
        expect.arrayContaining([new Date(2015, 4, 20), 20]),
      ])
    })
  })
})
