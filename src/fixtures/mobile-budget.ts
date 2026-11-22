import { buildCategoryMonthMetrics, MONTHS_IN_YEAR, roundCurrency } from '@/common/budget'
import type {
  MobileAccountBalance,
  MobileCategoryBudget,
  MobileCategoryInfo,
  MobileDashboardData,
  MobileSubcategoryBudget,
  MobileTransaction,
  MobileTransactionsPage,
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

export function buildMobileSubcategoryBudget(
  overrides: Partial<MobileSubcategoryBudget> & { monthlyAmount?: number } = {},
): MobileSubcategoryBudget {
  const { monthlyAmount = -100, ...rest } = overrides
  return {
    rowIndex: 30,
    category: 'Food & Groceries',
    name: 'Groceries',
    months: Array.from({ length: MONTHS_IN_YEAR }, () => monthlyAmount),
    ...rest,
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

function buildDefaultYearSubcategories(): Record<string, MobileSubcategoryBudget[]> {
  return {
    'Income': [
      buildMobileSubcategoryBudget({ rowIndex: 30, category: 'Income', name: 'Refunds', monthlyAmount: 0 }),
      buildMobileSubcategoryBudget({ rowIndex: 31, category: 'Income', name: 'Side Projects', monthlyAmount: 0 }),
    ],
    'Salary': [
      buildMobileSubcategoryBudget({ rowIndex: 35, category: 'Salary', name: 'Base Salary', monthlyAmount: 3000 }),
      buildMobileSubcategoryBudget({ rowIndex: 36, category: 'Salary', name: 'Bonus', monthlyAmount: 0 }),
    ],
    'Food & Groceries': [
      buildMobileSubcategoryBudget({ rowIndex: 40, category: 'Food & Groceries', name: 'Groceries', monthlyAmount: -300 }),
    ],
    'Restaurants & Bars': [
      buildMobileSubcategoryBudget({ rowIndex: 43, category: 'Restaurants & Bars', name: 'Restaurants', monthlyAmount: -100 }),
      buildMobileSubcategoryBudget({ rowIndex: 44, category: 'Restaurants & Bars', name: 'Cafes & Bars', monthlyAmount: -50 }),
    ],
    'Household & Utilities': [
      buildMobileSubcategoryBudget({ rowIndex: 48, category: 'Household & Utilities', name: 'Rent / Mortgage', monthlyAmount: -750 }),
      buildMobileSubcategoryBudget({ rowIndex: 49, category: 'Household & Utilities', name: 'Electricity & Water', monthlyAmount: -100 }),
      buildMobileSubcategoryBudget({ rowIndex: 50, category: 'Household & Utilities', name: 'Internet', monthlyAmount: -50 }),
    ],
    'Subscriptions': [
      buildMobileSubcategoryBudget({ rowIndex: 55, category: 'Subscriptions', name: 'Music & Video', monthlyAmount: -20 }),
      buildMobileSubcategoryBudget({ rowIndex: 56, category: 'Subscriptions', name: 'Cloud & Apps', monthlyAmount: -20 }),
    ],
    'Transport & Car': [
      buildMobileSubcategoryBudget({ rowIndex: 60, category: 'Transport & Car', name: 'Public Transit', monthlyAmount: -50 }),
      buildMobileSubcategoryBudget({ rowIndex: 61, category: 'Transport & Car', name: 'Fuel', monthlyAmount: -30 }),
    ],
    'Leisure & Entertainment': [
      buildMobileSubcategoryBudget({ rowIndex: 65, category: 'Leisure & Entertainment', name: 'Concerts & Cinema', monthlyAmount: -60 }),
      buildMobileSubcategoryBudget({ rowIndex: 66, category: 'Leisure & Entertainment', name: 'Hobbies', monthlyAmount: -40 }),
    ],
    'Savings & Investments': [
      buildMobileSubcategoryBudget({ rowIndex: 70, category: 'Savings & Investments', name: 'Index ETFs', monthlyAmount: -350 }),
      buildMobileSubcategoryBudget({ rowIndex: 71, category: 'Savings & Investments', name: 'Emergency Savings', monthlyAmount: -150 }),
    ],
  }
}

export function buildMobileTransactionsPageFixture(
  offset: number,
  limit = 20,
  totalCategorizedCount = 60,
): MobileTransactionsPage {
  const safeOffset = Math.max(0, offset)
  const count = Math.max(0, Math.min(limit, totalCategorizedCount - safeOffset))
  const merchants = ['Supermarket X', 'Bistro Central', 'Corner Bakery', 'City Transit', 'Stream App']
  const categories = [
    { name: 'Food & Groceries', icon: '🛒' },
    { name: 'Restaurants & Bars', icon: '🍽' },
    { name: 'Restaurants & Bars', icon: '🍽' },
    { name: 'Transport & Car', icon: '🚌' },
    { name: 'Subscriptions', icon: '🔃' },
  ]

  const transactions: MobileTransaction[] = Array.from({ length: count }, (_, i) => {
    const idx = safeOffset + i
    const cat = categories[idx % categories.length]
    const month = ((10 - Math.floor(idx / 8) + 12) % 12) + 1
    const day = ((27 - (idx % 25)) % 28) + 1
    return buildMobileTransaction({
      rowIndex: 20 + idx,
      ref: `tx-hist-${idx + 1}`,
      date: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      year: 2026,
      month,
      amount: -roundCurrency(10 + (idx % 7) * 6.5),
      contraAccount: merchants[idx % merchants.length],
      description: 'Synthetic historical card payment',
      icon: cat.icon,
      category: cat.name,
    })
  })

  const nextOffset = safeOffset + transactions.length
  return {
    transactions,
    nextOffset,
    hasMore: nextOffset < totalCategorizedCount,
    totalCategorizedCount,
  }
}

function buildDefaultMobileTransactions(
  currentYear: number,
  currentMonth: number,
): MobileTransaction[] {
  const monthStr = String(currentMonth).padStart(2, '0')
  return [
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
}

export function buildMobileDashboardFixture(
  overrides: Partial<MobileDashboardData> & { referenceMonth?: number } = {},
): MobileDashboardData {
  const { referenceMonth, ...dashboardOverrides } = overrides
  const currentYear = dashboardOverrides.currentYear ?? 2026
  const currentMonth = referenceMonth ?? 11
  const accounts = dashboardOverrides.accounts ?? DEFAULT_MOBILE_ACCOUNTS
  const totalLiquidBalance = dashboardOverrides.totalLiquidBalance ?? roundCurrency(
    accounts.reduce((sum, a) => sum + a.balance, 0),
  )
  const transactions = dashboardOverrides.transactions
    ?? buildDefaultMobileTransactions(currentYear, currentMonth)
  const uncategorizedCount = dashboardOverrides.uncategorizedCount
    ?? transactions.filter(t => t.category === '').length

  const defaults: MobileDashboardData = {
    currentYear,
    availableYears: [currentYear, currentYear - 1],
    categories: DEFAULT_MOBILE_CATEGORIES,
    accounts,
    totalLiquidBalance,
    netWorth: {
      netWorth: roundCurrency(totalLiquidBalance + 12000 + 35000 - 4500),
      liquidAssets: totalLiquidBalance,
      capital: 12000,
      investments: 35000,
      debt: -4500,
    },
    budgetsByYear: {
      [currentYear]: buildDefaultYearCategoryBudgets(currentMonth),
      [currentYear - 1]: buildDefaultYearCategoryBudgets(MONTHS_IN_YEAR),
    },
    subcategoriesByYear: {
      [currentYear]: buildDefaultYearSubcategories(),
      [currentYear - 1]: buildDefaultYearSubcategories(),
    },
    transactions,
    uncategorizedCount,
    nextCategorizedOffset: transactions.length - uncategorizedCount,
    hasMoreTransactions: true,
    totalTransactionCount: Math.max(transactions.length, 60),
  }

  return {
    ...defaults,
    ...dashboardOverrides,
  }
}
