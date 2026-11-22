import { NAMED_RANGES, YMYL_COLUMNS } from '@/common/constants'
import type { CellValue } from '@/common/types'
import { buildYMYLCellRow } from '@/fixtures/YMYL-row'
import { AccountUtils } from '../accounts/account-utils'
import type { YMYLSheet } from '../spreadsheet/YMYLSheet'
import {
  buildMobileDashboardData,
  buildYearCategoryBudgets,
  formatIsoDate,
  getAvailableBudgetYears,
  getTransactionsPage,
  isRowDisabled,
  parseNumberCell,
  parseRowDate,
  parseYearSubcategories,
  readCategories,
  readNetWorthSummary,
  readYearBudgetMap,
  scanSourceTransactions,
  updateSubcategoryBudgetInSheet,
  updateTransactionInSheet,
} from './service'

describe('mobile budget service', () => {
  describe('primitive helpers', () => {
    test('parseNumberCell parses numbers and strings and defaults to 0', () => {
      expect(parseNumberCell(-220.5)).toBe(-220.5)
      expect(parseNumberCell('302.80')).toBe(302.8)
      expect(parseNumberCell('None')).toBe(0)
      expect(parseNumberCell(null)).toBe(0)
    })

    test('parseRowDate handles Date, DD/MM/YYYY via parseDate, and ISO strings', () => {
      const validDate = new Date(2026, 10, 15)
      expect(parseRowDate(validDate)).toEqual(validDate)
      expect(parseRowDate(new Date('invalid'))).toBeNull()

      const iso = parseRowDate('2026-11-15')
      expect(iso?.getFullYear()).toBe(2026)
      expect(iso?.getMonth()).toBe(10)
      expect(iso?.getDate()).toBe(15)

      const isoTimestamp = parseRowDate('2026-11-15T00:00:00Z')
      expect(isoTimestamp).toBeInstanceOf(Date)
      expect(parseRowDate('')).toBeNull()
      expect(parseRowDate('not-a-date')).toBeNull()
    })

    test('formatIsoDate formats YYYY-MM-DD', () => {
      expect(formatIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05')
    })

    test('isRowDisabled detects boolean true and string TRUE', () => {
      expect(isRowDisabled(true)).toBe(true)
      expect(isRowDisabled('TRUE')).toBe(true)
      expect(isRowDisabled('false')).toBe(false)
      expect(isRowDisabled(false)).toBe(false)
    })
  })

  describe('sheet readers', () => {
    test('readNetWorthSummary reads wealth named ranges and normalizes debt as negative', () => {
      const namedValues: Record<string, number> = {
        [NAMED_RANGES.netWorth]: 45000,
        [NAMED_RANGES.totalCapital]: 10000,
        [NAMED_RANGES.totalInvestment]: 35000,
        [NAMED_RANGES.totalDebt]: 5000,
      }
      const mockSpreadsheet = {
        getRangeByName: vi.fn((name: string) =>
          name in namedValues ? { getValue: () => namedValues[name] } : null,
        ),
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      expect(readNetWorthSummary(mockSpreadsheet, 5000)).toEqual({
        netWorth: 45000,
        liquidAssets: 5000,
        capital: 10000,
        investments: 35000,
        debt: -5000,
      })
    })

    test('readNetWorthSummary gracefully handles missing named ranges', () => {
      const mockSpreadsheet = {
        getRangeByName: vi.fn(() => null),
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      expect(readNetWorthSummary(mockSpreadsheet, 1250.5)).toEqual({
        netWorth: null,
        liquidAssets: 1250.5,
        capital: null,
        investments: null,
        debt: null,
      })
    })

    test('readCategories extracts category icon, name, and description in order', () => {
      const mockSheet = {
        getDataRange: () => ({
          getValues: () => [
            ['Icon', 'Category', 'Description'],
            ['💶', 'Income', 'All income'],
            ['🛒', 'Food & Groceries', 'Supermarket'],
            ['', '', ''],
          ],
        }),
      }
      const mockSpreadsheet = {
        getSheetByName: vi.fn().mockReturnValue(mockSheet),
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      const categories = readCategories(mockSpreadsheet)
      expect(categories).toEqual([
        { name: 'Income', icon: '💶', description: 'All income' },
        { name: 'Food & Groceries', icon: '🛒', description: 'Supermarket' },
      ])
    })

    test('getAvailableBudgetYears returns sorted 4-digit year sheets up to 2 years', () => {
      const mockSpreadsheet = {
        getSheets: () => [
          { getName: () => 'source' },
          { getName: () => '2025' },
          { getName: () => '2026' },
          { getName: () => '2024' },
        ],
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      expect(getAvailableBudgetYears(mockSpreadsheet, 2026)).toEqual([2026, 2025])
    })

    test('readYearBudgetMap parses 12 monthly values until blank row', () => {
      const mockSheet = {
        getDataRange: () => ({
          getValues: () => [
            ['2026', '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            ['Food & Groceries', '🛒', -220, -220, -220, -220, -220, -220, -220, -230, -230, -230, -230, -230],
            ['', '⍰', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ['Ignored Below Blank', '❔', -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10, -10],
          ],
        }),
      }
      const mockSpreadsheet = {
        getSheetByName: vi.fn().mockReturnValue(mockSheet),
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      const map = readYearBudgetMap(mockSpreadsheet, 2026)
      expect(map.get('Food & Groceries')).toEqual([
        -220, -220, -220, -220, -220, -220, -220, -230, -230, -230, -230, -230,
      ])
      expect(map.has('Ignored Below Blank')).toBe(false)
    })

    test('parseYearSubcategories extracts subcategories beneath category header rows below summary block', () => {
      const values: CellValue[][] = [
        ['2026', '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        ['Food & Groceries', '🛒', -300, -300, -300, -300, -300, -300, -300, -300, -300, -300, -300, -300],
        ['Restaurants & Bars', '🍽', -150, -150, -150, -150, -150, -150, -150, -150, -150, -150, -150, -150],
        ['', '', -450, -450, -450, -450, -450, -450, -450, -450, -450, -450, -450, -450],
        ['Food & Groceries', '🛒', -300, -300, -300, -300, -300, -300, -300, -300, -300, -300, -300, -300],
        ['Groceries', '', -300, -300, -300, -300, -300, -300, -300, -300, -300, -300, -300, -300],
        ['Restaurants & Bars', '🍽', -150, -150, -150, -150, -150, -150, -150, -150, -150, -150, -150, -150],
        ['Restaurants', '', -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100],
        ['Cafes', '', -50, -50, -50, -50, -50, -50, -50, -50, -50, -50, -50, -50],
      ]

      const grouped = parseYearSubcategories(
        values,
        new Set(['Food & Groceries', 'Restaurants & Bars']),
      )

      expect(grouped['Food & Groceries']).toHaveLength(1)
      expect(grouped['Food & Groceries'][0]).toEqual({
        rowIndex: 6,
        category: 'Food & Groceries',
        name: 'Groceries',
        months: Array.from({ length: 12 }, () => -300),
      })

      expect(grouped['Restaurants & Bars'].map(s => ({ rowIndex: s.rowIndex, name: s.name }))).toEqual([
        { rowIndex: 8, name: 'Restaurants' },
        { rowIndex: 9, name: 'Cafes' },
      ])
    })
  })

  describe('scanSourceTransactions, pagination & buildYearCategoryBudgets', () => {
    test('aggregates actuals, counts uncategorized rows, skips disabled rows, and reports pagination flags', () => {
      const rawRows: CellValue[][] = [
        Array.from(YMYL_COLUMNS),
        buildYMYLCellRow({
          ref: 'tx-uncat',
          date: new Date(2026, 10, 15),
          amount: -15,
          category: '',
          icon: '⛔',
          contra_account: 'Coffee Shop',
        }),
        buildYMYLCellRow({
          ref: 'tx-groceries-1',
          date: new Date(2026, 10, 12),
          amount: -40.25,
          category: 'Food & Groceries',
        }),
        buildYMYLCellRow({
          ref: 'tx-groceries-2',
          date: new Date(2026, 10, 10),
          amount: -20,
          category: 'Food & Groceries',
        }),
        buildYMYLCellRow({
          ref: 'tx-groceries-disabled',
          date: new Date(2026, 10, 12),
          amount: -100,
          category: 'Food & Groceries',
          disabled: true,
        }),
      ]

      const accountsByIban = new Map([['TEST01BANK0000000001', 'Aurora Bank']])
      const categoryIcons = new Map([['Food & Groceries', '🛒']])

      const result = scanSourceTransactions(rawRows, accountsByIban, categoryIcons, 1)

      expect(result.uncategorizedCount).toBe(1)
      expect(result.transactions.map(t => t.ref)).toEqual(['tx-uncat', 'tx-groceries-1'])
      expect(result.nextCategorizedOffset).toBe(1)
      expect(result.hasMoreTransactions).toBe(true)
      expect(result.totalTransactionCount).toBe(3)

      // Actuals must still include ALL categorized rows even beyond pageLimit
      const novActual = result.actualsByYear.get(2026)?.get('Food & Groceries')?.[10]
      expect(novActual).toBe(-60.25)

      // Fetch next page starting at offset 1
      const page2 = getTransactionsPage(rawRows, accountsByIban, categoryIcons, 1, 2)
      expect(page2.transactions.map(t => t.ref)).toEqual(['tx-groceries-2'])
      expect(page2.nextOffset).toBe(2)
      expect(page2.hasMore).toBe(false)
      expect(page2.totalCategorizedCount).toBe(2)
    })

    test('computes monthly difference and cumulative YTD runningTotal up to current month', () => {
      const categories = [{ name: 'Food & Groceries', icon: '🛒', description: '' }]
      const budgetMap = new Map([
        ['Food & Groceries', [-200, -200, -200, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
      ])
      const actualsMap = new Map([
        ['Food & Groceries', [-180, -250, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]],
      ])

      const now = new Date(2026, 1, 15)
      const budgets = buildYearCategoryBudgets(categories, budgetMap, actualsMap, 2026, now)

      expect(budgets).toHaveLength(1)
      const [jan, feb, mar] = budgets[0].months

      expect(jan).toEqual({
        month: 1,
        actual: -180,
        budget: -200,
        difference: 20,
        runningTotal: 20,
      })

      expect(feb).toEqual({
        month: 2,
        actual: -250,
        budget: -200,
        difference: -50,
        runningTotal: -30,
      })

      expect(mar.runningTotal).toBe(-30)
    })

    test('buildMobileDashboardData combines categories, accounts, net worth, budgets, subcategories, and transactions', () => {
      vi.spyOn(AccountUtils, 'getAccountsWithBalances').mockReturnValueOnce([
        { slug: 'aurora-bank', label: 'Aurora Bank', iban: 'TEST01BANK0000000001', balance: 1500.5 },
      ])

      const categoriesSheet = {
        getDataRange: () => ({
          getValues: () => [
            ['Icon', 'Category', 'Description'],
            ['🛒', 'Food & Groceries', 'Supermarket'],
          ],
        }),
      }
      const yearSheet = {
        getDataRange: () => ({
          getValues: () => [
            ['2026', '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            ['Food & Groceries', '🛒', -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200],
            ['', '', -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200],
            ['Food & Groceries', '🛒', -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200],
            ['Groceries', '', -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200],
          ],
        }),
      }

      const mockSpreadsheet = {
        getRangeByName: vi.fn((name: string) =>
          name === NAMED_RANGES.netWorth ? { getValue: () => 25000 } : null,
        ),
        getSheetByName: vi.fn((name: string) => {
          if (name === 'categories') return categoriesSheet
          if (name === '2026') return yearSheet
          return null
        }),
        getSheets: () => [{ getName: () => '2026' }],
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      const mockYmylSheet = {
        getRawData: () => [
          Array.from(YMYL_COLUMNS),
          buildYMYLCellRow({ ref: 'tx-1', date: new Date(2026, 10, 10), amount: -50 }),
        ],
      } as unknown as YMYLSheet

      const dashboard = buildMobileDashboardData(mockSpreadsheet, mockYmylSheet, new Date(2026, 10, 16))
      expect(dashboard.currentYear).toBe(2026)
      expect(dashboard.totalLiquidBalance).toBe(1500.5)
      expect(dashboard.netWorth.netWorth).toBe(25000)
      expect(dashboard.netWorth.liquidAssets).toBe(1500.5)
      expect(dashboard.categories).toHaveLength(1)
      expect(dashboard.budgetsByYear[2026][0].months[10].actual).toBe(-50)
      expect(dashboard.subcategoriesByYear[2026]['Food & Groceries']).toHaveLength(1)
      expect(dashboard.subcategoriesByYear[2026]['Food & Groceries'][0].rowIndex).toBe(5)
      expect(dashboard.transactions).toHaveLength(1)
      expect(dashboard.hasMoreTransactions).toBe(false)
    })
  })

  describe('updateTransactionInSheet', () => {
    test('updates comments and category directly when rowIndex matches ref', () => {
      const targetRow = buildYMYLCellRow({ ref: 'tx-direct' })
      const setValuesMock = vi.fn()
      const mockYmylSheet = {
        sheet: {
          getRange: vi.fn(() => ({
            getValues: () => [targetRow],
          })),
        },
        getRawData: vi.fn(),
        setValues: setValuesMock,
      } as unknown as YMYLSheet

      const result = updateTransactionInSheet(mockYmylSheet, {
        rowIndex: 5,
        ref: 'tx-direct',
        category: 'Restaurants & Bars',
        comments: 'Dinner with friends',
      })

      expect(result).toEqual({ rowIndex: 5 })
      expect(setValuesMock).toHaveBeenCalledTimes(2)
      expect(setValuesMock).toHaveBeenNthCalledWith(1, 5, 8, 1, 1, [['Dinner with friends']])
      expect(setValuesMock).toHaveBeenNthCalledWith(2, 5, 10, 1, 1, [['Restaurants & Bars']])
    })

    test('falls back to scanning getRawData when rowIndex has shifted', () => {
      const otherRow = buildYMYLCellRow({ ref: 'tx-other' })
      const shiftedRow = buildYMYLCellRow({ ref: 'tx-shifted' })
      const setValuesMock = vi.fn()

      const mockYmylSheet = {
        sheet: {
          getRange: vi.fn(() => ({
            getValues: () => [otherRow],
          })),
        },
        getRawData: vi.fn(() => [
          Array.from(YMYL_COLUMNS),
          otherRow,
          shiftedRow, // index 2 -> 1-based rowIndex 3
        ]),
        setValues: setValuesMock,
      } as unknown as YMYLSheet

      const result = updateTransactionInSheet(mockYmylSheet, {
        rowIndex: 2,
        ref: 'tx-shifted',
        category: 'Transport & Car',
        comments: 'Train ticket',
      })

      expect(result).toEqual({ rowIndex: 3 })
      expect(setValuesMock).toHaveBeenNthCalledWith(1, 3, 8, 1, 1, [['Train ticket']])
      expect(setValuesMock).toHaveBeenNthCalledWith(2, 3, 10, 1, 1, [['Transport & Car']])
    })

    test('throws when transaction ref does not exist in sheet', () => {
      const mockYmylSheet = {
        sheet: {
          getRange: vi.fn(() => ({
            getValues: () => [buildYMYLCellRow({ ref: 'tx-1' })],
          })),
        },
        getRawData: vi.fn(() => [Array.from(YMYL_COLUMNS)]),
        setValues: vi.fn(),
      } as unknown as YMYLSheet

      expect(() =>
        updateTransactionInSheet(mockYmylSheet, {
          rowIndex: 2,
          ref: 'missing-ref',
          category: 'Income',
          comments: '',
        }),
      ).toThrow('Transaction \'missing-ref\' was not found in the source sheet.')
    })
  })

  describe('updateSubcategoryBudgetInSheet', () => {
    test('writes only modified month cells and returns recalculated 12-month array', () => {
      const monthsState = [-200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200, -200]
      const setValueCalls: Array<{ row: number, col: number, value: number }> = []

      const mockYearSheet = {
        getRange: vi.fn((row: number, col: number, _numRows?: number, numCols?: number) => {
          if (numCols === 12) {
            return { getValues: () => [monthsState] }
          }
          if (col === 1) return { getValue: () => 'Groceries' }
          if (col === 2) return { getValue: () => '' }
          return {
            setValue: (val: number) => {
              setValueCalls.push({ row, col, value: val })
              monthsState[col - 3] = val
            },
          }
        }),
      }

      const mockSpreadsheet = {
        getSheetByName: vi.fn((name: string) => (name === '2026' ? mockYearSheet : null)),
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      const result = updateSubcategoryBudgetInSheet(mockSpreadsheet, {
        year: 2026,
        category: 'Food & Groceries',
        subcategoryName: 'Groceries',
        rowIndex: 42,
        monthUpdates: { 3: -250, 11: -325.5 },
      })

      expect(result.rowIndex).toBe(42)
      expect(setValueCalls).toEqual([
        { row: 42, col: 5, value: -250 },
        { row: 42, col: 13, value: -325.5 },
      ])
      expect(result.updatedSubcategoryMonths[2]).toBe(-250)
      expect(result.updatedSubcategoryMonths[10]).toBe(-325.5)
      expect(result.updatedSubcategoryMonths[0]).toBe(-200)
    })

    test('falls back to scanning sheet when subcategory rowIndex shifted', () => {
      const updatedValues = [-100, -150, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100]
      const setValueSpy = vi.fn()

      const categoriesSheet = {
        getDataRange: () => ({
          getValues: () => [
            ['Icon', 'Category', 'Description'],
            ['🍽', 'Restaurants & Bars', 'Dining'],
          ],
        }),
      }
      const yearSheet = {
        getRange: vi.fn((row: number, col: number, _numRows?: number, numCols?: number) => {
          if (numCols === 12) return { getValues: () => [updatedValues] }
          if (row === 44 && col === 1) return { getValue: () => 'Different Subcategory' }
          if (row === 44 && col === 2) return { getValue: () => '' }
          return { setValue: setValueSpy }
        }),
        getDataRange: () => ({
          getValues: () => [
            ['2026', '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            ['Restaurants & Bars', '🍽', -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100],
            ['', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            ['Restaurants & Bars', '🍽', -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100],
            ['Cafes', '', -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100, -100],
          ],
        }),
      }

      const mockSpreadsheet = {
        getSheetByName: vi.fn((name: string) => {
          if (name === 'categories') return categoriesSheet
          if (name === '2026') return yearSheet
          return null
        }),
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      const result = updateSubcategoryBudgetInSheet(mockSpreadsheet, {
        year: 2026,
        category: 'Restaurants & Bars',
        subcategoryName: 'Cafes',
        rowIndex: 44,
        monthUpdates: { 2: -150 },
      })

      expect(result.rowIndex).toBe(5)
      expect(setValueSpy).toHaveBeenCalledWith(-150)
    })

    test('throws when year sheet does not exist', () => {
      const mockSpreadsheet = {
        getSheetByName: vi.fn(() => null),
      } as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet

      expect(() =>
        updateSubcategoryBudgetInSheet(mockSpreadsheet, {
          year: 2099,
          category: 'Food & Groceries',
          subcategoryName: 'Groceries',
          rowIndex: 10,
          monthUpdates: { 1: -100 },
        }),
      ).toThrow('Year budget sheet \'2099\' was not found.')
    })
  })
})
