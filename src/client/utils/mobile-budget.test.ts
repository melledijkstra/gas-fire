import type { MobileDashboardData } from '@/common/types'
import {
  buildMobileCategoryBudget,
  buildMobileDashboardFixture,
  buildMobileTransaction,
} from '@/fixtures/mobile-budget'
import {
  applyOptimisticTransactionEdit,
  computeCategoryDetail,
  computeMonthlyExpenseSummary,
  computeOverBudgetCategories,
  filterMobileTransactions,
  formatCurrency,
} from './mobile-budget'

function createTestDashboard(): MobileDashboardData {
  return buildMobileDashboardFixture({
    currentYear: 2026,
    availableYears: [2026],
    categories: [
      { name: 'Salary', icon: '💰', description: 'Salary' },
      { name: 'Food & Groceries', icon: '🛒', description: 'Supermarket' },
      { name: 'Restaurants & Bars', icon: '🍽', description: 'Dining' },
    ],
    budgetsByYear: {
      2026: [
        buildMobileCategoryBudget({
          category: 'Salary',
          icon: '💰',
          description: 'Salary',
          monthlyBudget: 2800,
          actualsByMonth: { 11: 2800 },
          maxRunningTotalMonth: 11,
        }),
        buildMobileCategoryBudget({
          category: 'Food & Groceries',
          icon: '🛒',
          description: 'Supermarket',
          monthlyBudget: -200,
          actualsByMonth: { 11: -210 },
          maxRunningTotalMonth: 11,
        }),
        buildMobileCategoryBudget({
          category: 'Restaurants & Bars',
          icon: '🍽',
          description: 'Dining',
          monthlyBudget: -150,
          actualsByMonth: { 11: -100 },
          maxRunningTotalMonth: 11,
        }),
      ],
    },
    transactions: [
      buildMobileTransaction({
        rowIndex: 2,
        ref: 'tx-1',
        date: '2026-11-15',
        year: 2026,
        month: 11,
        amount: -30,
        contraAccount: 'Restaurant X',
        description: 'Dinner',
        category: '',
        icon: '⛔',
      }),
      buildMobileTransaction({
        rowIndex: 3,
        ref: 'tx-2',
        date: '2026-11-12',
        year: 2026,
        month: 11,
        amount: -210,
        contraAccount: 'Supermarket X',
        description: 'Weekly groceries',
        comments: 'big shop',
        icon: '🛒',
        category: 'Food & Groceries',
      }),
    ],
    uncategorizedCount: 1,
  })
}

describe('mobile-budget utilities', () => {
  test('formatCurrency formats EUR amounts', () => {
    expect(formatCurrency(-210.5)).toContain('210.50')
  })

  test('applyOptimisticTransactionEdit updates transaction, uncategorizedCount, and category budget', () => {
    const dashboard = createTestDashboard()
    const snapshot = applyOptimisticTransactionEdit(
      dashboard,
      'tx-1',
      'Restaurants & Bars',
      'Friday dinner',
      new Date(2026, 10, 16),
    )

    expect(snapshot?.previousCategory).toBe('')
    expect(dashboard.uncategorizedCount).toBe(0)

    const updatedTx = dashboard.transactions.find(t => t.ref === 'tx-1')!
    expect(updatedTx.category).toBe('Restaurants & Bars')
    expect(updatedTx.comments).toBe('Friday dinner')
    expect(updatedTx.icon).toBe('🍽')

    const diningBudget = dashboard.budgetsByYear[2026].find(b => b.category === 'Restaurants & Bars')!
    const novMetric = diningBudget.months[10]
    expect(novMetric.actual).toBe(-130)
    expect(novMetric.difference).toBe(20)

    applyOptimisticTransactionEdit(
      dashboard,
      'tx-1',
      'Food & Groceries',
      'Actually groceries',
      new Date(2026, 10, 16),
    )
    expect(diningBudget.months[10].actual).toBe(-100)
    const foodBudget = dashboard.budgetsByYear[2026].find(b => b.category === 'Food & Groceries')!
    expect(foodBudget.months[10].actual).toBe(-240)
  })

  test('computeOverBudgetCategories returns categories exceeding their monthly budget', () => {
    const dashboard = createTestDashboard()
    const overBudget = computeOverBudgetCategories(dashboard.budgetsByYear[2026], 11)
    expect(overBudget).toEqual([
      {
        category: 'Food & Groceries',
        icon: '🛒',
        actual: -210,
        budget: -200,
        difference: -10,
      },
    ])
  })

  test('computeMonthlyExpenseSummary excludes income categories and calculates utilization', () => {
    const dashboard = createTestDashboard()
    const summary = computeMonthlyExpenseSummary(dashboard.budgetsByYear[2026], 11)
    expect(summary).toEqual({
      totalActualExpense: -310,
      totalBudgetedExpense: -350,
      remainingExpenseBudget: 40,
      utilizationPercent: 89,
    })
  })

  test('filterMobileTransactions filters by uncategorized vs all and searchQuery', () => {
    const dashboard = createTestDashboard()
    expect(
      filterMobileTransactions(dashboard.transactions, 'uncategorized', '').map(t => t.ref),
    ).toEqual(['tx-1'])

    expect(
      filterMobileTransactions(dashboard.transactions, 'all', '').map(t => t.ref),
    ).toEqual(['tx-1', 'tx-2'])

    expect(
      filterMobileTransactions(dashboard.transactions, 'all', 'supermarket x').map(t => t.ref),
    ).toEqual(['tx-2'])
  })

  test('computeCategoryDetail returns 12-month budget and month transactions', () => {
    const dashboard = createTestDashboard()
    const detail = computeCategoryDetail(dashboard, 2026, 11, 'Food & Groceries')

    expect(detail?.budget.category).toBe('Food & Groceries')
    expect(detail?.transactions.map(t => t.ref)).toEqual(['tx-2'])
    expect(computeCategoryDetail(dashboard, 2026, 11, null)).toBeNull()
  })
})
