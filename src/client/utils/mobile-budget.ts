import {
  adjustMonthMetricActual,
  getMaxElapsedMonth,
  recalculateCategoryBudgetMonths,
  roundCurrency,
} from '@/common/budget'
import type {
  MobileCategoryBudget,
  MobileCategoryMonthMetric,
  MobileDashboardData,
  MobileSubcategoryBudget,
  MobileTransaction,
} from '@/common/types'

export type MobileTab = 'overview' | 'budgets' | 'transactions'
export type BudgetViewMode = 'monthly' | 'ytd'
export type TransactionFilterMode = 'uncategorized' | 'all'

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

export const SHORT_MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const

export function formatCurrency(value: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function applyConfirmedTransactionEdit(
  dashboard: MobileDashboardData,
  ref: string,
  newCategory: string,
  newComments: string,
  updatedRowIndex?: number,
  referenceDate: Date = new Date(),
): boolean {
  const tx = dashboard.transactions.find(item => item.ref === ref)
  if (!tx) {
    return false
  }

  const previousCategory = tx.category
  const trimmedCategory = newCategory.trim()
  const trimmedComments = newComments.trim()

  if (previousCategory !== trimmedCategory) {
    updateUncategorizedCounter(dashboard, previousCategory, trimmedCategory)
    updateYearBudgetsForCategoryChange(
      dashboard,
      tx,
      previousCategory,
      trimmedCategory,
      referenceDate,
    )
  }

  const categoryInfo = dashboard.categories.find(c => c.name === trimmedCategory)
  tx.category = trimmedCategory
  tx.comments = trimmedComments
  tx.icon = trimmedCategory ? (categoryInfo?.icon ?? '⍰') : '⛔'
  if (updatedRowIndex !== undefined) {
    tx.rowIndex = updatedRowIndex
  }

  return true
}

export function applyConfirmedSubcategoryBudgetEdit(
  dashboard: MobileDashboardData,
  year: number,
  category: string,
  subcategoryName: string,
  updatedRowIndex: number,
  updatedSubcategoryMonths: number[],
  referenceDate: Date = new Date(),
): boolean {
  const yearSubcategories = dashboard.subcategoriesByYear[year]
  const categorySubcategories = yearSubcategories?.[category]
  const targetSub = categorySubcategories?.find(s => s.name === subcategoryName)
  if (!targetSub) {
    return false
  }

  const budgetDeltasByMonth: Record<number, number> = {}
  for (let i = 0; i < updatedSubcategoryMonths.length; i++) {
    const prevVal = targetSub.months[i] ?? 0
    const nextVal = roundCurrency(updatedSubcategoryMonths[i] ?? 0)
    const delta = roundCurrency(nextVal - prevVal)
    if (delta !== 0) {
      budgetDeltasByMonth[i + 1] = delta
    }
  }

  targetSub.rowIndex = updatedRowIndex
  targetSub.months = updatedSubcategoryMonths.map(v => roundCurrency(v))

  const parentBudget = (dashboard.budgetsByYear[year] ?? []).find(b => b.category === category)
  if (parentBudget && Object.keys(budgetDeltasByMonth).length > 0) {
    const maxMonth = getMaxElapsedMonth(year, referenceDate)
    recalculateCategoryBudgetMonths(parentBudget.months, budgetDeltasByMonth, maxMonth)
  }

  return true
}

export function mergeTransactionPages(
  existing: MobileTransaction[],
  incoming: MobileTransaction[],
): MobileTransaction[] {
  const seenRefs = new Set(existing.map(tx => tx.ref))
  const merged = [...existing]

  for (const tx of incoming) {
    if (!seenRefs.has(tx.ref)) {
      seenRefs.add(tx.ref)
      merged.push(tx)
    }
  }

  return merged
}

function updateUncategorizedCounter(
  dashboard: MobileDashboardData,
  previousCategory: string,
  trimmedCategory: string,
): void {
  if (previousCategory === '' && trimmedCategory !== '') {
    dashboard.uncategorizedCount = Math.max(0, dashboard.uncategorizedCount - 1)
  }
  else if (previousCategory !== '' && trimmedCategory === '') {
    dashboard.uncategorizedCount += 1
  }
}

function updateYearBudgetsForCategoryChange(
  dashboard: MobileDashboardData,
  tx: MobileTransaction,
  previousCategory: string,
  trimmedCategory: string,
  referenceDate: Date,
): void {
  const yearBudgets = dashboard.budgetsByYear[tx.year]
  if (!yearBudgets) {
    return
  }

  const maxMonth = getMaxElapsedMonth(tx.year, referenceDate)

  if (previousCategory !== '') {
    const oldCatBudget = yearBudgets.find(b => b.category === previousCategory)
    if (oldCatBudget) {
      adjustMonthMetricActual(oldCatBudget.months, tx.month, -tx.amount, maxMonth)
    }
  }

  if (trimmedCategory !== '') {
    const newCatBudget = yearBudgets.find(b => b.category === trimmedCategory)
    if (newCatBudget) {
      adjustMonthMetricActual(newCatBudget.months, tx.month, tx.amount, maxMonth)
    }
  }
}

export function getCategoryMetricForMonth(
  budget: MobileCategoryBudget,
  month: number,
): MobileCategoryMonthMetric {
  const found = budget.months.find(m => m.month === month)
  return found ?? {
    month,
    actual: 0,
    budget: 0,
    difference: 0,
    runningTotal: 0,
  }
}

export function computeOverBudgetCategories(
  budgets: MobileCategoryBudget[],
  month: number,
): Array<{
  category: string
  icon: string
  actual: number
  budget: number
  difference: number
}> {
  const results: Array<{
    category: string
    icon: string
    actual: number
    budget: number
    difference: number
  }> = []

  for (const item of budgets) {
    const metric = getCategoryMetricForMonth(item, month)
    const isExpenseOrOutflow = metric.budget < 0 || (metric.budget === 0 && metric.actual < 0)
    if (isExpenseOrOutflow && metric.difference < 0) {
      results.push({
        category: item.category,
        icon: item.icon,
        actual: metric.actual,
        budget: metric.budget,
        difference: metric.difference,
      })
    }
  }

  return results.sort((a, b) => a.difference - b.difference)
}

export function computeMonthlyExpenseSummary(
  budgets: MobileCategoryBudget[],
  month: number,
): {
  totalActualExpense: number
  totalBudgetedExpense: number
  remainingExpenseBudget: number
  utilizationPercent: number
} {
  let totalActualExpense = 0
  let totalBudgetedExpense = 0

  for (const item of budgets) {
    const metric = getCategoryMetricForMonth(item, month)
    const isIncome = metric.budget > 0 || (metric.budget === 0 && metric.actual > 0)
    if (!isIncome) {
      totalActualExpense = roundCurrency(totalActualExpense + metric.actual)
      totalBudgetedExpense = roundCurrency(totalBudgetedExpense + metric.budget)
    }
  }

  const remainingExpenseBudget = roundCurrency(totalActualExpense - totalBudgetedExpense)
  const absBudget = Math.abs(totalBudgetedExpense)
  const absActual = Math.abs(totalActualExpense)
  const utilizationPercent = absBudget > 0
    ? Math.min(100, Math.round((absActual / absBudget) * 100))
    : 0

  return {
    totalActualExpense,
    totalBudgetedExpense,
    remainingExpenseBudget,
    utilizationPercent,
  }
}

export function filterMobileTransactions(
  transactions: MobileTransaction[],
  filterMode: TransactionFilterMode,
  searchQuery: string,
): MobileTransaction[] {
  const query = searchQuery.trim().toLowerCase()

  return transactions.filter((tx) => {
    if (filterMode === 'uncategorized' && tx.category !== '') {
      return false
    }

    if (!query) {
      return true
    }

    return (
      tx.contraAccount.toLowerCase().includes(query)
      || tx.description.toLowerCase().includes(query)
      || tx.comments.toLowerCase().includes(query)
      || tx.category.toLowerCase().includes(query)
      || tx.accountLabel.toLowerCase().includes(query)
    )
  })
}

export function computeCategoryDetail(
  dashboard: MobileDashboardData | null,
  year: number,
  month: number,
  categoryName: string | null,
): {
  budget: MobileCategoryBudget
  transactions: MobileTransaction[]
  subcategories: MobileSubcategoryBudget[]
} | null {
  if (!categoryName || !dashboard) {
    return null
  }

  const budgets = dashboard.budgetsByYear[year] ?? []
  const budget = budgets.find(b => b.category === categoryName)
  if (!budget) {
    return null
  }

  const transactions = dashboard.transactions.filter(
    tx =>
      tx.category === categoryName
      && tx.year === year
      && tx.month === month,
  )

  const subcategories = dashboard.subcategoriesByYear[year]?.[categoryName] ?? []

  return { budget, transactions, subcategories }
}
