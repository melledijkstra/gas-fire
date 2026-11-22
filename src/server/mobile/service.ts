import {
  buildCategoryMonthMetrics,
  getMaxElapsedMonth,
  MONTHS_IN_YEAR,
  roundCurrency,
} from '@/common/budget'
import { CATEGORIES_SHEET_NAME, NAMED_RANGES, YMYL_COLUMNS } from '@/common/constants'
import { cleanString, getRowHash } from '@/common/helpers'
import { YMYLTable } from '@/common/table/YMYLTable'
import type {
  CellValue,
  MobileAccountBalance,
  MobileCategoryBudget,
  MobileCategoryInfo,
  MobileDashboardData,
  MobileNetWorthSummary,
  MobileSubcategoryBudget,
  MobileSubcategoryBudgetUpdatePayload,
  MobileSubcategoryBudgetUpdateResult,
  MobileTransaction,
  MobileTransactionsPage,
  MobileTransactionUpdatePayload,
} from '@/common/types'
import { AccountUtils, isNumeric } from '../accounts/account-utils'
import { parseDate } from '../parsers/date'
import type { YMYLSheet } from '../spreadsheet/YMYLSheet'

export const DEFAULT_TRANSACTION_PAGE_SIZE = 200
const MAX_BUDGET_YEARS = 2

const COL_REF = YMYLTable.getYMYLColumnIndex('ref')
const COL_IBAN = YMYLTable.getYMYLColumnIndex('iban')
const COL_DATE = YMYLTable.getYMYLColumnIndex('date')
const COL_AMOUNT = YMYLTable.getYMYLColumnIndex('amount')
const COL_CONTRA_ACCOUNT = YMYLTable.getYMYLColumnIndex('contra_account')
const COL_DESCRIPTION = YMYLTable.getYMYLColumnIndex('description')
const COL_COMMENTS = YMYLTable.getYMYLColumnIndex('comments')
const COL_ICON = YMYLTable.getYMYLColumnIndex('icon')
const COL_CATEGORY = YMYLTable.getYMYLColumnIndex('category')
const COL_LABEL = YMYLTable.getYMYLColumnIndex('label')
const COL_DISABLED = YMYLTable.getYMYLColumnIndex('disabled')
const COL_CURRENCY = YMYLTable.getYMYLColumnIndex('currency')

export function parseNumberCell(cell: unknown): number {
  return isNumeric(cell) ? Number.parseFloat(String(cell)) : 0
}

export function parseRowDate(cell: CellValue): Date | null {
  if (cell instanceof Date) {
    return Number.isNaN(cell.getTime()) ? null : cell
  }

  if (typeof cell !== 'string' || cell.trim() === '') {
    return null
  }

  try {
    return parseDate(cell)
  }
  catch {
    const fallback = new Date(cell.trim())
    return Number.isNaN(fallback.getTime()) ? null : fallback
  }
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isRowDisabled(cell: CellValue): boolean {
  return cell === true || cleanString(String(cell ?? '')).toLowerCase() === 'true'
}

export function getRowIdentifier(row: CellValue[]): string {
  const ref = cleanString(String(row[COL_REF] ?? ''))
  return ref || getRowHash(row)
}

function readNamedNumber(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  rangeName: string,
): number | null {
  if (typeof spreadsheet.getRangeByName !== 'function') {
    return null
  }
  const range = spreadsheet.getRangeByName(rangeName)
  if (!range) {
    return null
  }
  const value = range.getValue()
  return isNumeric(value) ? roundCurrency(Number.parseFloat(String(value))) : null
}

export function readNetWorthSummary(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  totalLiquidBalance: number,
): MobileNetWorthSummary {
  const rawDebt = readNamedNumber(spreadsheet, NAMED_RANGES.totalDebt)
  let normalizedDebt: number | null = null
  if (rawDebt !== null) {
    normalizedDebt = rawDebt === 0 ? 0 : roundCurrency(-Math.abs(rawDebt))
  }

  return {
    netWorth: readNamedNumber(spreadsheet, NAMED_RANGES.netWorth),
    liquidAssets: roundCurrency(totalLiquidBalance),
    capital: readNamedNumber(spreadsheet, NAMED_RANGES.totalCapital),
    investments: readNamedNumber(spreadsheet, NAMED_RANGES.totalInvestment),
    debt: normalizedDebt,
  }
}

export function readCategories(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
): MobileCategoryInfo[] {
  const sheet = spreadsheet.getSheetByName(CATEGORIES_SHEET_NAME)
  if (!sheet) {
    return []
  }

  const values = sheet.getDataRange().getValues() as CellValue[][]
  const categories: MobileCategoryInfo[] = []

  for (let i = 1; i < values.length; i++) {
    const row = values[i]
    const name = cleanString(String(row?.[1] ?? ''))
    if (!name) {
      continue
    }

    const icon = cleanString(String(row?.[0] ?? '')) || '⍰'
    const description = cleanString(String(row?.[2] ?? ''))
    categories.push({ name, icon, description })
  }

  return categories
}

export function getAvailableBudgetYears(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  currentYear: number,
): number[] {
  const years = new Set<number>([currentYear])
  const sheets = spreadsheet.getSheets()

  for (const sheet of sheets) {
    const sheetName = typeof sheet.getName === 'function' ? sheet.getName() : ''
    if (/^20\d{2}$/.test(sheetName)) {
      years.add(Number.parseInt(sheetName, 10))
    }
  }

  return Array.from(years)
    .sort((a, b) => b - a)
    .slice(0, MAX_BUDGET_YEARS)
}

function parseMonthValues(row: CellValue[]): number[] {
  const months: number[] = []
  for (let m = 0; m < MONTHS_IN_YEAR; m++) {
    months.push(roundCurrency(parseNumberCell(row[m + 2])))
  }
  return months
}

export function parseYearBudgetMap(values: CellValue[][]): Map<string, number[]> {
  const budgetMap = new Map<string, number[]>()

  for (let i = 1; i < values.length; i++) {
    const row = values[i]
    const categoryName = cleanString(String(row?.[0] ?? ''))
    if (!categoryName) {
      break
    }

    budgetMap.set(categoryName, parseMonthValues(row))
  }

  return budgetMap
}

export function readYearBudgetMap(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  year: number,
): Map<string, number[]> {
  const sheet = spreadsheet.getSheetByName(String(year))
  if (!sheet) {
    return new Map<string, number[]>()
  }

  const values = sheet.getDataRange().getValues() as CellValue[][]
  return parseYearBudgetMap(values)
}

function findSummaryEndIndex(values: CellValue[][]): number {
  for (let i = 1; i < values.length; i++) {
    const colA = cleanString(String(values[i]?.[0] ?? ''))
    if (!colA) {
      return i
    }
  }
  return values.length
}

export function parseYearSubcategories(
  values: CellValue[][],
  categoryNames: Set<string>,
): Record<string, MobileSubcategoryBudget[]> {
  const result: Record<string, MobileSubcategoryBudget[]> = {}
  const startIndex = findSummaryEndIndex(values) + 1
  let activeCategory: string | null = null

  for (let i = startIndex; i < values.length; i++) {
    const row = values[i]
    const colA = cleanString(String(row?.[0] ?? ''))
    const colB = cleanString(String(row?.[1] ?? ''))

    if (!colA) {
      continue
    }

    if (categoryNames.has(colA) && colB !== '') {
      activeCategory = colA
      result[activeCategory] ??= []
      continue
    }

    if (activeCategory && colB === '') {
      result[activeCategory].push({
        rowIndex: i + 1,
        category: activeCategory,
        name: colA,
        months: parseMonthValues(row),
      })
    }
  }

  return result
}

function addCategoryActual(
  actualsByYear: Map<number, Map<string, number[]>>,
  year: number,
  month: number,
  category: string,
  amount: number,
): void {
  let yearMap = actualsByYear.get(year)
  if (!yearMap) {
    yearMap = new Map<string, number[]>()
    actualsByYear.set(year, yearMap)
  }

  let months = yearMap.get(category)
  if (!months) {
    months = Array.from({ length: MONTHS_IN_YEAR }, () => 0)
    yearMap.set(category, months)
  }

  months[month - 1] = roundCurrency(months[month - 1] + amount)
}

function toMobileTransaction(
  row: CellValue[],
  rowIndex: number,
  date: Date,
  amount: number,
  accountsByIban: Map<string, string>,
  categoryIcons: Map<string, string>,
): MobileTransaction {
  const iban = cleanString(String(row[COL_IBAN] ?? ''))
  const category = cleanString(String(row[COL_CATEGORY] ?? ''))
  const rawIcon = cleanString(String(row[COL_ICON] ?? ''))
  const resolvedIcon = category
    ? (categoryIcons.get(category) ?? (rawIcon || '⍰'))
    : '⛔'

  return {
    rowIndex,
    ref: getRowIdentifier(row),
    iban,
    accountLabel: accountsByIban.get(iban) ?? iban,
    date: formatIsoDate(date),
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    amount,
    contraAccount: cleanString(String(row[COL_CONTRA_ACCOUNT] ?? '')),
    description: cleanString(String(row[COL_DESCRIPTION] ?? '')),
    comments: cleanString(String(row[COL_COMMENTS] ?? '')),
    icon: resolvedIcon,
    category,
    label: cleanString(String(row[COL_LABEL] ?? '')),
    currency: cleanString(String(row[COL_CURRENCY] ?? '')) || 'EUR',
  }
}

export function scanSourceTransactions(
  rawRows: CellValue[][],
  accountsByIban: Map<string, string>,
  categoryIcons: Map<string, string>,
  pageLimit: number = DEFAULT_TRANSACTION_PAGE_SIZE,
): {
  actualsByYear: Map<number, Map<string, number[]>>
  transactions: MobileTransaction[]
  uncategorizedCount: number
  nextCategorizedOffset: number
  hasMoreTransactions: boolean
  totalTransactionCount: number
} {
  const actualsByYear = new Map<number, Map<string, number[]>>()
  const transactions: MobileTransaction[] = []
  let uncategorizedCount = 0
  let totalCategorizedCount = 0
  let categorizedIncludedCount = 0

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!row || isRowDisabled(row[COL_DISABLED])) {
      continue
    }

    const date = parseRowDate(row[COL_DATE])
    if (!date) {
      continue
    }

    const amount = roundCurrency(parseNumberCell(row[COL_AMOUNT]))
    const category = cleanString(String(row[COL_CATEGORY] ?? ''))
    const isUncategorized = category === ''

    if (isUncategorized) {
      uncategorizedCount++
      transactions.push(toMobileTransaction(row, i + 1, date, amount, accountsByIban, categoryIcons))
      continue
    }

    totalCategorizedCount++
    addCategoryActual(actualsByYear, date.getFullYear(), date.getMonth() + 1, category, amount)

    if (categorizedIncludedCount < pageLimit) {
      transactions.push(toMobileTransaction(row, i + 1, date, amount, accountsByIban, categoryIcons))
      categorizedIncludedCount++
    }
  }

  return {
    actualsByYear,
    transactions,
    uncategorizedCount,
    nextCategorizedOffset: categorizedIncludedCount,
    hasMoreTransactions: categorizedIncludedCount < totalCategorizedCount,
    totalTransactionCount: uncategorizedCount + totalCategorizedCount,
  }
}

export function getTransactionsPage(
  rawRows: CellValue[][],
  accountsByIban: Map<string, string>,
  categoryIcons: Map<string, string>,
  offset: number,
  limit: number = DEFAULT_TRANSACTION_PAGE_SIZE,
): MobileTransactionsPage {
  const safeOffset = Math.max(0, Math.floor(offset))
  const safeLimit = Math.max(1, Math.floor(limit))
  const transactions: MobileTransaction[] = []
  let categorizedIndex = 0

  for (let i = 1; i < rawRows.length; i++) {
    const row = rawRows[i]
    if (!row || isRowDisabled(row[COL_DISABLED])) {
      continue
    }

    const date = parseRowDate(row[COL_DATE])
    if (!date) {
      continue
    }

    const category = cleanString(String(row[COL_CATEGORY] ?? ''))
    if (category === '') {
      continue
    }

    if (categorizedIndex >= safeOffset && transactions.length < safeLimit) {
      const amount = roundCurrency(parseNumberCell(row[COL_AMOUNT]))
      transactions.push(toMobileTransaction(row, i + 1, date, amount, accountsByIban, categoryIcons))
    }
    categorizedIndex++
  }

  const nextOffset = safeOffset + transactions.length
  return {
    transactions,
    nextOffset,
    hasMore: nextOffset < categorizedIndex,
    totalCategorizedCount: categorizedIndex,
  }
}

export function buildYearCategoryBudgets(
  categories: MobileCategoryInfo[],
  budgetMap: Map<string, number[]>,
  actualsMap: Map<string, number[]> | undefined,
  year: number,
  now: Date,
): MobileCategoryBudget[] {
  const maxElapsedMonth = getMaxElapsedMonth(year, now)

  return categories.map((cat) => {
    const budgets = budgetMap.get(cat.name) ?? []
    const actuals = actualsMap?.get(cat.name) ?? []

    return {
      category: cat.name,
      icon: cat.icon,
      description: cat.description,
      months: buildCategoryMonthMetrics(budgets, actuals, maxElapsedMonth),
    }
  })
}

export function buildMobileDashboardData(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  ymylSheet: YMYLSheet,
  now: Date = new Date(),
): MobileDashboardData {
  const currentYear = now.getFullYear()
  const categories = readCategories(spreadsheet)
  const categoryIcons = new Map(categories.map(c => [c.name, c.icon]))
  const categoryNames = new Set(categories.map(c => c.name))

  const accounts: MobileAccountBalance[] = AccountUtils.getAccountsWithBalances()
  const accountsByIban = new Map(accounts.map(a => [a.iban, a.label]))
  const totalLiquidBalance = roundCurrency(
    accounts.reduce((sum, account) => sum + account.balance, 0),
  )
  const netWorth = readNetWorthSummary(spreadsheet, totalLiquidBalance)

  const rawRows = ymylSheet.getRawData()
  const {
    actualsByYear,
    transactions,
    uncategorizedCount,
    nextCategorizedOffset,
    hasMoreTransactions,
    totalTransactionCount,
  } = scanSourceTransactions(rawRows, accountsByIban, categoryIcons)

  const availableYears = getAvailableBudgetYears(spreadsheet, currentYear)
  const budgetsByYear: Record<number, MobileCategoryBudget[]> = {}
  const subcategoriesByYear: Record<number, Record<string, MobileSubcategoryBudget[]>> = {}

  for (const year of availableYears) {
    const yearSheet = spreadsheet.getSheetByName(String(year))
    const yearValues = yearSheet ? (yearSheet.getDataRange().getValues() as CellValue[][]) : []
    const budgetMap = parseYearBudgetMap(yearValues)
    const actualsMap = actualsByYear.get(year)
    budgetsByYear[year] = buildYearCategoryBudgets(categories, budgetMap, actualsMap, year, now)
    subcategoriesByYear[year] = parseYearSubcategories(yearValues, categoryNames)
  }

  return {
    currentYear,
    availableYears,
    categories,
    accounts,
    totalLiquidBalance,
    netWorth,
    budgetsByYear,
    subcategoriesByYear,
    transactions,
    uncategorizedCount,
    nextCategorizedOffset,
    hasMoreTransactions,
    totalTransactionCount,
  }
}

export function buildMobileTransactionsPage(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  ymylSheet: YMYLSheet,
  offset: number,
  limit: number = DEFAULT_TRANSACTION_PAGE_SIZE,
): MobileTransactionsPage {
  const categories = readCategories(spreadsheet)
  const categoryIcons = new Map(categories.map(c => [c.name, c.icon]))
  const accounts = AccountUtils.getAccountsWithBalances()
  const accountsByIban = new Map(accounts.map(a => [a.iban, a.label]))

  return getTransactionsPage(ymylSheet.getRawData(), accountsByIban, categoryIcons, offset, limit)
}

function findMatchingRowIndex(ymylSheet: YMYLSheet, rowIndex: number, ref: string): number {
  if (rowIndex >= 2) {
    const candidateRows = ymylSheet.sheet
      .getRange(rowIndex, 1, 1, YMYL_COLUMNS.length)
      .getValues() as CellValue[][]
    if (candidateRows[0] && getRowIdentifier(candidateRows[0]) === ref) {
      return rowIndex
    }
  }

  const allRows = ymylSheet.getRawData()
  for (let i = 1; i < allRows.length; i++) {
    if (allRows[i] && getRowIdentifier(allRows[i]) === ref) {
      return i + 1
    }
  }

  throw new Error(`Transaction '${ref}' was not found in the source sheet.`)
}

export function updateTransactionInSheet(
  ymylSheet: YMYLSheet,
  payload: MobileTransactionUpdatePayload,
): { rowIndex: number } {
  const targetRowIndex = findMatchingRowIndex(ymylSheet, payload.rowIndex, payload.ref)

  ymylSheet.setValues(targetRowIndex, COL_COMMENTS + 1, 1, 1, [[payload.comments]])
  ymylSheet.setValues(targetRowIndex, COL_CATEGORY + 1, 1, 1, [[payload.category]])

  return { rowIndex: targetRowIndex }
}

function findSubcategoryRowIndex(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  payload: MobileSubcategoryBudgetUpdatePayload,
): number {
  if (payload.rowIndex >= 2) {
    const candidateName = cleanString(String(sheet.getRange(payload.rowIndex, 1).getValue() ?? ''))
    const candidateIcon = cleanString(String(sheet.getRange(payload.rowIndex, 2).getValue() ?? ''))
    if (candidateName === payload.subcategoryName && candidateIcon === '') {
      return payload.rowIndex
    }
  }

  const categories = readCategories(spreadsheet)
  const categoryNames = new Set(categories.map(c => c.name))
  const values = sheet.getDataRange().getValues() as CellValue[][]
  const grouped = parseYearSubcategories(values, categoryNames)
  const match = (grouped[payload.category] ?? []).find(sub => sub.name === payload.subcategoryName)

  if (match) {
    return match.rowIndex
  }

  throw new Error(
    `Subcategory '${payload.subcategoryName}' under '${payload.category}' was not found in sheet '${payload.year}'.`,
  )
}

export function updateSubcategoryBudgetInSheet(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  payload: MobileSubcategoryBudgetUpdatePayload,
): MobileSubcategoryBudgetUpdateResult {
  const sheet = spreadsheet.getSheetByName(String(payload.year))
  if (!sheet) {
    throw new Error(`Year budget sheet '${payload.year}' was not found.`)
  }

  const targetRowIndex = findSubcategoryRowIndex(sheet, spreadsheet, payload)

  for (const [monthKey, rawValue] of Object.entries(payload.monthUpdates)) {
    const month = Number.parseInt(monthKey, 10)
    if (month < 1 || month > MONTHS_IN_YEAR || !Number.isFinite(rawValue)) {
      continue
    }
    sheet.getRange(targetRowIndex, month + 2).setValue(roundCurrency(rawValue))
  }

  if (typeof SpreadsheetApp !== 'undefined' && typeof SpreadsheetApp.flush === 'function') {
    SpreadsheetApp.flush()
  }

  const updatedRow = sheet
    .getRange(targetRowIndex, 3, 1, MONTHS_IN_YEAR)
    .getValues()[0] as CellValue[]

  return {
    rowIndex: targetRowIndex,
    updatedSubcategoryMonths: updatedRow.map(cell => roundCurrency(parseNumberCell(cell))),
  }
}
