import {
  SheetMock,
  SpreadsheetMock,
} from '../../../test-setup'
import type { RawTable } from '@/common/types'
import { N26ImportMock } from '@/fixtures/n26'
import { FireTable } from '../table/FireTable'
import { AccountUtils } from '../accounts/account-utils'
import { raboImportMock } from '@/fixtures/rabobank'
import { Logger } from '@/common/logger'
import {
  previewPipeline,
  importPipeline,
} from './rpc'
import { Config } from '../config'
import bankOfAmericaCSV from '@/fixtures/commonwealth-bank.csv?raw'
import Papa from 'papaparse'
import { fakeTestBankImportData } from '@/fixtures/test-bank'
import { removeFilterCriteria } from '../spreadsheet/spreadsheet'
import { FireSheet } from '../spreadsheet/FireSheet'
import { slugify } from '@/common/helpers'
import { loadImportRules } from '../rule-engine'
import type { ImportRule } from '../rule-engine'

vi.mock('../rule-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../rule-engine')>()
  return {
    ...actual,
    loadImportRules: vi.fn(() => ({ rules: [], warnings: [] })),
  }
})

const loadImportRulesMock = vi.mocked(loadImportRules)

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  getSourceSheet: vi.fn(() => SheetMock),
}))

vi.mock('../spreadsheet/FireSheet')
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

const getLocaleMock = vi.mocked(FireSheet.getLocale)
const removeFilterCriteriaMock = vi.mocked(removeFilterCriteria)
removeFilterCriteriaMock.mockReturnValue(true)

const configSpy = vi.spyOn(Config, 'getAccountConfiguration')
const importDataSpy = vi.spyOn(FireSheet.prototype, 'importData')

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

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('previewPipeline', () => {
    let getBalanceSpy: ReturnType<typeof vi.spyOn>
    let fireSheetSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      getBalanceSpy = vi.spyOn(AccountUtils, 'getBalance').mockReturnValue(302.8)
      fireSheetSpy = vi.spyOn(FireSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new FireTable([]))
    })

    afterEach(() => {
      getBalanceSpy.mockRestore()
      fireSheetSpy.mockRestore()
    })

    test('is able to handle table without any useful data and should return the current balance', () => {
      const table: RawTable = [['TransactionAmount', 'TransactionDate', 'Payee'], ['', '', '']]
      const response = previewPipeline(
        table,
        BANK_ID,
      )

      expect(response.success).toBe(true)
      if (response.success) {
        expect(response.data?.newBalance).toBeCloseTo(302.8, 2)
        expect(response.data?.summary.validCount).toBe(0)
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
        expect(response.data?.summary.validCount).toBe(3)
      }
    })
  })

  describe('importPipeline', () => {
    beforeAll(() => {
      Logger.disable()
    })

    let fireSheetSpy: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      fireSheetSpy = vi.spyOn(FireSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new FireTable([]))
    })

    afterEach(() => {
      fireSheetSpy.mockRestore()
    })

    test('handles empty import', () => {
      const result = importPipeline([], BANK_ID)

      expect(importDataSpy).not.toHaveBeenCalled()
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('No header row detected in import data!')
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
        expect(result.error).toBe('No rows to import, check your import data or configuration!')
      }
    })

    test('removes filters if any are set', () => {
      removeFilterCriteriaMock.mockReturnValue(true)

      importPipeline([], 'TestBank')

      expect(FireSheet.prototype.getFilter).toHaveBeenCalled()
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
      const [fireTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
      expect(fireTable.getData()).toEqual(expect.arrayContaining([
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
      const [fireTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
      expect(fireTable.getData()).toEqual([
        expect.arrayContaining([new Date(2016, 0, 23), -25.6]),
        expect.arrayContaining([new Date(2015, 4, 21), 58.3]),
        expect.arrayContaining([new Date(2015, 4, 20), 20]),
      ])
    })
  })

  describe('rule engine integration', () => {
    const testBankConfig = new Config({
      accountId: BANK_ID,
      columnMap: {
        amount: 'TransactionAmount',
        date: 'TransactionDate',
        description: 'Description',
      },
    })

    const testData: RawTable = [
      ['TransactionAmount', 'TransactionDate', 'Description'],
      ['50', '2024-01-15', 'Grocery Store'],
      ['-100', '2024-01-16', 'Internal Transfer'],
      ['30', '2024-01-17', 'Coffee Shop'],
    ]

    beforeAll(() => {
      Logger.disable()
    })

    beforeEach(() => {
      configSpy.mockReturnValue(testBankConfig)
    })

    describe('previewPipeline with rules', () => {
      let getBalanceSpy: ReturnType<typeof vi.spyOn>
      let fireSheetSpy: ReturnType<typeof vi.spyOn>

      beforeEach(() => {
        getBalanceSpy = vi.spyOn(AccountUtils, 'getBalance').mockReturnValue(1000)
        fireSheetSpy = vi.spyOn(FireSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new FireTable([]))
      })

      afterEach(() => {
        getBalanceSpy.mockRestore()
        fireSheetSpy.mockRestore()
      })

      test('excluded rows appear with removed status', () => {
        const excludeRule: ImportRule = {
          ruleName: 'Exclude Internal',
          banks: ['all'],
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'Internal',
          action: 'EXCLUDE',
          actionColumn: 'description',
          stopProcessing: true,
          rulePhase: 'POST_TRANSFORM',
          rowIndex: 2,
        }
        loadImportRulesMock.mockReturnValue({ rules: [excludeRule], warnings: [] })

        const response = previewPipeline(structuredClone(testData), BANK_ID)

        expect(response.success).toBe(true)
        if (response.success && response.data) {
          expect(response.data.summary.removedCount).toBe(1)
          expect(response.data.summary.validCount).toBe(2)
          expect(response.data.summary.rulesApplied).toBe(1)
          expect(response.data.summary.rulesLoaded).toBe(1)

          // Find the excluded row by checking transactionMeta
          const removedHashes = Object.entries(response.data.transactionMeta)
            .filter(([_, meta]) => meta.status === 'removed')
            .map(([hash]) => hash)
          expect(removedHashes).toHaveLength(1)

          // ruleInfo should contain the exclusion details
          expect(response.data.ruleInfo).toBeDefined()
          const info = response.data.ruleInfo![removedHashes[0]]
          expect(info.excludedByRule).toBe('Exclude Internal')
        }
      })

      test('rule warnings are included in report', () => {
        loadImportRulesMock.mockReturnValue({
          rules: [],
          warnings: [{ ruleName: 'Bad Rule', rowIndex: 3, message: 'Invalid condition' }],
        })

        const response = previewPipeline(structuredClone(testData), BANK_ID)

        expect(response.success).toBe(true)
        if (response.success && response.data) {
          expect(response.data.ruleWarnings).toHaveLength(1)
          expect(response.data.ruleWarnings![0].ruleName).toBe('Bad Rule')
        }
      })

      test('excluded rows do not count toward new balance', () => {
        getBalanceSpy.mockReturnValue(1000)
        const excludeRule: ImportRule = {
          ruleName: 'Exclude Internal',
          banks: ['all'],
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'Internal',
          action: 'EXCLUDE',
          actionColumn: 'description',
          stopProcessing: true,
          rulePhase: 'POST_TRANSFORM',
          rowIndex: 2,
        }
        loadImportRulesMock.mockReturnValue({ rules: [excludeRule], warnings: [] })

        const response = previewPipeline(structuredClone(testData), BANK_ID)

        if (response.success && response.data) {
          // Only Grocery Store (50) and Coffee Shop (30) should count = 80
          // -100 Internal Transfer is excluded
          expect(response.data.newBalance).toBeCloseTo(1080, 0)
        }
      })
    })

    describe('importPipeline with rules', () => {
      let fireSheetSpy: ReturnType<typeof vi.spyOn>

      beforeEach(() => {
        fireSheetSpy = vi.spyOn(FireSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new FireTable([]))
      })

      afterEach(() => {
        fireSheetSpy.mockRestore()
      })

      test('excluded rows are not imported', () => {
        const excludeRule: ImportRule = {
          ruleName: 'Exclude Internal',
          banks: ['all'],
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'Internal',
          action: 'EXCLUDE',
          actionColumn: 'description',
          stopProcessing: true,
          rulePhase: 'POST_TRANSFORM',
          rowIndex: 2,
        }
        loadImportRulesMock.mockReturnValue({ rules: [excludeRule], warnings: [] })

        const result = importPipeline(structuredClone(testData), BANK_ID)

        expect(result.success).toBe(true)
        expect(importDataSpy).toHaveBeenCalled()
        const [fireTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
        // Should only have 2 rows (Grocery Store + Coffee Shop)
        expect(fireTable.getRowCount()).toBe(2)
        // The Internal Transfer row should not be present
        const descriptions = fireTable.getFireColumn('description')
        expect(descriptions).not.toContainEqual('Internal Transfer')
      })

      test('SET rules modify data before import', () => {
        const setRule: ImportRule = {
          ruleName: 'Categorize Coffee',
          banks: ['all'],
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'Coffee',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Eating Out',
          stopProcessing: false,
          rulePhase: 'POST_TRANSFORM',
          rowIndex: 2,
        }
        loadImportRulesMock.mockReturnValue({ rules: [setRule], warnings: [] })

        const result = importPipeline(structuredClone(testData), BANK_ID)

        expect(result.success).toBe(true)
        expect(importDataSpy).toHaveBeenCalled()
        const [fireTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
        const categories = fireTable.getFireColumn('category')
        // One of the rows should have 'Eating Out' category
        expect(categories).toContainEqual('Eating Out')
      })

      test('PRE_TRANSFORM rules run on raw CSV column names', () => {
        const preRule: ImportRule = {
          ruleName: 'Exclude by raw column',
          banks: ['all'],
          conditionColumn: 'Description',
          condition: 'CONTAINS',
          conditionValue: 'Internal',
          action: 'EXCLUDE',
          actionColumn: 'Description',
          stopProcessing: true,
          rulePhase: 'PRE_TRANSFORM',
          rowIndex: 2,
        }
        loadImportRulesMock.mockReturnValue({ rules: [preRule], warnings: [] })

        const result = importPipeline(structuredClone(testData), BANK_ID)

        expect(result.success).toBe(true)
        expect(importDataSpy).toHaveBeenCalled()
        const [fireTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
        expect(fireTable.getRowCount()).toBe(2)
      })

      test('import message includes rule stats', () => {
        const excludeRule: ImportRule = {
          ruleName: 'Exclude Internal',
          banks: ['all'],
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'Internal',
          action: 'EXCLUDE',
          actionColumn: 'description',
          stopProcessing: true,
          rulePhase: 'POST_TRANSFORM',
          rowIndex: 2,
        }
        loadImportRulesMock.mockReturnValue({ rules: [excludeRule], warnings: [] })

        const result = importPipeline(structuredClone(testData), BANK_ID)

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.message).toContain('imported 2 rows!')
          expect(result.message).toContain('1 rule(s) applied')
          expect(result.message).toContain('1 row(s) excluded by rules')
        }
      })
    })
  })
})
