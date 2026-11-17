import { buildCategoryMonthMetrics, MONTHS_IN_YEAR, roundCurrency } from '@/common/budget'
import type {
  MobileAccountBalance,
  MobileCategoryBudget,
  MobileCategoryInfo,
  MobileDashboardData,
  MobileTransaction,
} from '@/common/types'

const DEFAULT_MOBILE_CATEGORIES: MobileCategoryInfo[] = [
  { name: 'Income', icon: '💶', description: 'Non-salary income' },
  { name: 'Salary', icon: '💰', description: 'Monthly salary' },
  { name: 'Food & Groceries', icon: '🛒', description: 'Supermarket and groceries' },
  { name: 'Restaurants & Bars', icon: '🍽', description: 'Dining out and cafes' },
  { name: 'Household & Utilities', icon: '🏠', description: 'Rent, electricity, water, internet' },
  { name: 'Subscriptions', icon: '🔃', description: 'Recurring digital subscriptions' },
  { name: 'Transport & Car', icon: '🚌', description: 'Metro, bus, train, fuel' },
  { name: 'Leisure & Entertainment', icon: '🌴', description: 'Concerts, hobbies, cinema' },
  { name: 'Savings & Investments', icon: '📈', description: 'Monthly ETF & savings contributions' },
]

const DEFAULT_MOBILE_ACCOUNTS: MobileAccountBalance[] = [
  { slug: 'aurora-bank', label: 'Aurora Bank', iban: 'TEST01AURORA00000001', balance: 2450.0 },
  { slug: 'cerulean-bank', label: 'Cerulean Bank', iban: 'TEST02CERULEAN000002', balance: 1200.5 },
  { slug: 'emerald-savings', label: 'Emerald Savings', iban: 'TEST03EMERALD0000003', balance: 5000.0 },
]

interface BuildCategoryBudgetOptions {
  category?: string
  icon?: string
  description?: string
  monthlyBudget?: number
  monthlyActual?: number
  actualsByMonth?: Record<number, number>
  budgetsByMonth?: Record<number, number>
  maxRunningTotalMonth?: number
}

export function buildMobileCategoryBudget(
  options: BuildCategoryBudgetOptions = {},
): MobileCategoryBudget {
  const {
    category = 'Food & Groceries',
    icon = '🛒',
    description = 'Supermarket and groceries',
    monthlyBudget = -200,
    monthlyActual = 0,
    actualsByMonth = {},
    budgetsByMonth = {},
    maxRunningTotalMonth = MONTHS_IN_YEAR,
  } = options

  const budgets = Array.from(
    { length: MONTHS_IN_YEAR },
    (_, idx) => budgetsByMonth[idx + 1] ?? monthlyBudget,
  )
  const actuals = Array.from(
    { length: MONTHS_IN_YEAR },
    (_, idx) => actualsByMonth[idx + 1] ?? monthlyActual,
  )

  return {
    category,
    icon,
    description,
    months: buildCategoryMonthMetrics(budgets, actuals, maxRunningTotalMonth),
  }
}

export function buildMobileTransaction(
  overrides: Partial<MobileTransaction> = {},
): MobileTransaction {
  return {
    rowIndex: 2,
    ref: 'tx-1',
    iban: 'TEST01AURORA00000001',
    accountLabel: 'Aurora Bank',
    date: '2026-11-15',
    year: 2026,
    month: 11,
    amount: -25.0,
    contraAccount: 'Bistro Central',
    description: 'Card payment',
    comments: '',
    icon: '⛔',
    category: '',
    label: '',
    currency: 'EUR',
    ...overrides,
  }
}

function buildDefaultYearCategoryBudgets(
  maxRunningTotalMonth = MONTHS_IN_YEAR,
): MobileCategoryBudget[] {
  const monthlyConfigs: Record<string, { budget: number, actual: number }> = {
    'Income': { budget: 0, actual: 0 },
    'Salary': { budget: 3000, actual: 3000 },
    'Food & Groceries': { budget: -300, actual: -320 },
    'Restaurants & Bars': { budget: -150, actual: -110 },
    'Household & Utilities': { budget: -900, actual: -900 },
    'Subscriptions': { budget: -40, actual: -45 },
    'Transport & Car': { budget: -80, actual: -55 },
    'Leisure & Entertainment': { budget: -100, actual: -60 },
    'Savings & Investments': { budget: -500, actual: -500 },
  }

  return DEFAULT_MOBILE_CATEGORIES.map((cat) => {
    const cfg = monthlyConfigs[cat.name] ?? { budget: -100, actual: -50 }
    return buildMobileCategoryBudget({
      category: cat.name,
      icon: cat.icon,
      description: cat.description,
      monthlyBudget: cfg.budget,
      monthlyActual: cfg.actual,
      maxRunningTotalMonth,
    })
  })
}

export function buildMobileDashboardFixture(
  overrides: Partial<MobileDashboardData> & { referenceMonth?: number } = {},
): MobileDashboardData {
  const currentYear = overrides.currentYear ?? 2026
  const currentMonth = overrides.referenceMonth ?? 11
  const monthStr = String(currentMonth).padStart(2, '0')
  const accounts = overrides.accounts ?? DEFAULT_MOBILE_ACCOUNTS
  const totalLiquidBalance = overrides.totalLiquidBalance ?? roundCurrency(
    accounts.reduce((sum, a) => sum + a.balance, 0),
  )

  const transactions = overrides.transactions ?? [
    buildMobileTransaction({
      rowIndex: 2,
      ref: 'tx-uncat-1',
      date: `${currentYear}-${monthStr}-15`,
      year: currentYear,
      month: currentMonth,
      amount: -28.5,
      contraAccount: 'Bistro Central',
      description: 'Card payment',
    }),
    buildMobileTransaction({
      rowIndex: 3,
      ref: 'tx-uncat-2',
      date: `${currentYear}-${monthStr}-14`,
      year: currentYear,
      month: currentMonth,
      amount: -18.2,
      contraAccount: 'Supermarket X',
      description: 'Weekly groceries',
    }),
    buildMobileTransaction({
      rowIndex: 4,
      ref: 'tx-cat-1',
      date: `${currentYear}-${monthStr}-11`,
      year: currentYear,
      month: currentMonth,
      amount: -9.5,
      contraAccount: 'Corner Bakery',
      description: 'Breakfast coffee',
      comments: 'Morning coffee',
      icon: '🍽',
      category: 'Restaurants & Bars',
    }),
  ]

  const uncategorizedCount = overrides.uncategorizedCount
    ?? transactions.filter(t => t.category === '').length

  return {
    currentYear,
    availableYears: overrides.availableYears ?? [currentYear, currentYear - 1],
    categories: overrides.categories ?? DEFAULT_MOBILE_CATEGORIES,
    accounts,
    totalLiquidBalance,
    budgetsByYear: overrides.budgetsByYear ?? {
      [currentYear]: buildDefaultYearCategoryBudgets(currentMonth),
      [currentYear - 1]: buildDefaultYearCategoryBudgets(MONTHS_IN_YEAR),
    },
    transactions,
    uncategorizedCount,
    webAppUrl: overrides.webAppUrl ?? 'https://script.google.com/macros/s/mock-deployment-id/exec',
  }
}
