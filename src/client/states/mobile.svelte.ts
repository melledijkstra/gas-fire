import type {
  MobileCategoryBudget,
  MobileDashboardData,
  MobileTransaction,
} from '@/common/types'
import { SvelteSet } from 'svelte/reactivity'
import {
  applyOptimisticTransactionEdit,
  type BudgetViewMode,
  computeCategoryDetail,
  computeMonthlyExpenseSummary,
  computeOverBudgetCategories,
  filterMobileTransactions,
  type MobileTab,
  type TransactionFilterMode,
} from '../utils/mobile-budget'
import { serverFunctions } from '../utils/serverFunctions'

export interface MobileState {
  activeTab: MobileTab
  selectedYear: number
  selectedMonth: number
  budgetViewMode: BudgetViewMode
  selectedCategoryName: string | null
  transactionFilter: TransactionFilterMode
  searchQuery: string
  isLoading: boolean
  isSyncing: boolean
  errorMessage: string | null
  statusMessage: string | null
  dashboard: MobileDashboardData | null
  savingRefs: SvelteSet<string>
}

const now = new Date()

export const mobileState: MobileState = $state({
  activeTab: 'overview',
  selectedYear: now.getFullYear(),
  selectedMonth: now.getMonth() + 1,
  budgetViewMode: 'monthly',
  selectedCategoryName: null,
  transactionFilter: 'uncategorized',
  searchQuery: '',
  isLoading: false,
  isSyncing: false,
  errorMessage: null,
  statusMessage: null,
  dashboard: null,
  savingRefs: new SvelteSet<string>(),
})

export function getSelectedYearBudgets(): MobileCategoryBudget[] {
  if (!mobileState.dashboard) {
    return []
  }
  return mobileState.dashboard.budgetsByYear[mobileState.selectedYear] ?? []
}

export function getOverBudgetCategories() {
  return computeOverBudgetCategories(getSelectedYearBudgets(), mobileState.selectedMonth)
}

export function getMonthlyExpenseSummary() {
  return computeMonthlyExpenseSummary(getSelectedYearBudgets(), mobileState.selectedMonth)
}

export function getFilteredTransactions(): MobileTransaction[] {
  return filterMobileTransactions(
    mobileState.dashboard?.transactions ?? [],
    mobileState.transactionFilter,
    mobileState.searchQuery,
  )
}

export function getSelectedCategoryDetail() {
  return computeCategoryDetail(
    mobileState.dashboard,
    mobileState.selectedYear,
    mobileState.selectedMonth,
    mobileState.selectedCategoryName,
  )
}

export async function loadMobileDashboard(): Promise<void> {
  mobileState.isLoading = true
  mobileState.errorMessage = null

  const res = await serverFunctions.getMobileDashboardData()
  if (res.success) {
    mobileState.dashboard = res.data
    if (!res.data.availableYears.includes(mobileState.selectedYear)) {
      mobileState.selectedYear = res.data.currentYear
    }
  }
  else {
    mobileState.errorMessage = res.error
  }

  mobileState.isLoading = false
}

export async function syncMobileBankTransactions(): Promise<void> {
  mobileState.isSyncing = true
  mobileState.errorMessage = null
  mobileState.statusMessage = null

  const res = await serverFunctions.triggerEnableBankingSync()
  if (res.success) {
    mobileState.statusMessage = res.message ?? 'Bank sync completed!'
    await loadMobileDashboard()
  }
  else {
    mobileState.errorMessage = `Sync failed: ${res.error}`
  }

  mobileState.isSyncing = false
}

export async function saveMobileTransactionEdit(
  ref: string,
  newCategory: string,
  newComments: string,
): Promise<boolean> {
  const dashboard = mobileState.dashboard
  if (!dashboard) {
    return false
  }

  const snapshot = applyOptimisticTransactionEdit(dashboard, ref, newCategory, newComments)
  if (!snapshot) {
    return false
  }

  mobileState.savingRefs.add(ref)
  mobileState.errorMessage = null

  const res = await serverFunctions.updateMobileTransaction({
    rowIndex: snapshot.transaction.rowIndex,
    ref,
    category: snapshot.transaction.category,
    comments: snapshot.transaction.comments,
  })

  mobileState.savingRefs.delete(ref)

  if (res.success) {
    snapshot.transaction.rowIndex = res.data.rowIndex
    return true
  }

  applyOptimisticTransactionEdit(
    dashboard,
    ref,
    snapshot.previousCategory,
    snapshot.previousComments,
  )
  mobileState.errorMessage = `Failed to save transaction: ${res.error}`
  return false
}
