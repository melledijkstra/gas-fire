import type {
  MobileCategoryBudget,
  MobileDashboardData,
  MobileSubcategoryBudgetUpdatePayload,
  MobileTransaction,
} from '@/common/types'
import { SvelteSet } from 'svelte/reactivity'
import {
  applyConfirmedSubcategoryBudgetEdit,
  applyConfirmedTransactionEdit,
  type BudgetViewMode,
  computeCategoryDetail,
  computeMonthlyExpenseSummary,
  computeOverBudgetCategories,
  filterMobileTransactions,
  mergeTransactionPages,
  type MobileTab,
  type TransactionFilterMode,
} from '../utils/mobile-budget'
import { serverFunctions } from '../utils/serverFunctions'

const TRANSACTIONS_PAGE_SIZE = 200

export interface MobileState {
  activeTab: MobileTab
  selectedYear: number
  selectedMonth: number
  budgetViewMode: BudgetViewMode
  selectedCategoryName: string | null
  transactionFilter: TransactionFilterMode
  searchQuery: string
  isLoading: boolean
  isLoadingMoreTransactions: boolean
  isSyncing: boolean
  isSavingSubcategory: boolean
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
  isLoadingMoreTransactions: false,
  isSyncing: false,
  isSavingSubcategory: false,
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

export async function loadMoreMobileTransactions(): Promise<void> {
  const dashboard = mobileState.dashboard
  if (!dashboard || !dashboard.hasMoreTransactions || mobileState.isLoadingMoreTransactions) {
    return
  }

  mobileState.isLoadingMoreTransactions = true
  mobileState.errorMessage = null

  const res = await serverFunctions.getMobileTransactionsPage(
    dashboard.nextCategorizedOffset,
    TRANSACTIONS_PAGE_SIZE,
  )

  if (res.success) {
    dashboard.transactions = mergeTransactionPages(dashboard.transactions, res.data.transactions)
    dashboard.nextCategorizedOffset = res.data.nextOffset
    dashboard.hasMoreTransactions = res.data.hasMore
  }
  else {
    mobileState.errorMessage = `Failed to load more transactions: ${res.error}`
  }

  mobileState.isLoadingMoreTransactions = false
}

export async function syncMobileBankTransactions(): Promise<void> {
  mobileState.isSyncing = true
  mobileState.errorMessage = null
  mobileState.statusMessage = null

  const res = await serverFunctions.triggerEnableBankingSync()
  if (res.success) {
    await loadMobileDashboard()
    mobileState.statusMessage = res.message ?? 'Bank sync completed!'
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
  const tx = dashboard?.transactions.find(item => item.ref === ref)
  if (!dashboard || !tx) {
    return false
  }

  mobileState.savingRefs.add(ref)
  mobileState.errorMessage = null

  const trimmedCategory = newCategory.trim()
  const trimmedComments = newComments.trim()

  const res = await serverFunctions.updateMobileTransaction({
    rowIndex: tx.rowIndex,
    ref,
    category: trimmedCategory,
    comments: trimmedComments,
  })

  mobileState.savingRefs.delete(ref)

  if (res.success) {
    applyConfirmedTransactionEdit(dashboard, ref, trimmedCategory, trimmedComments, res.data.rowIndex)
    mobileState.statusMessage = 'Transaction saved.'
    return true
  }

  mobileState.errorMessage = `Failed to save transaction: ${res.error}`
  return false
}

export async function saveSubcategoryBudgetEdit(
  payload: MobileSubcategoryBudgetUpdatePayload,
): Promise<boolean> {
  const dashboard = mobileState.dashboard
  if (!dashboard) {
    return false
  }

  mobileState.isSavingSubcategory = true
  mobileState.errorMessage = null

  const res = await serverFunctions.updateMobileSubcategoryBudget(payload)

  mobileState.isSavingSubcategory = false

  if (res.success) {
    applyConfirmedSubcategoryBudgetEdit(
      dashboard,
      payload.year,
      payload.category,
      payload.subcategoryName,
      res.data.rowIndex,
      res.data.updatedSubcategoryMonths,
    )
    mobileState.statusMessage = `Saved ${payload.subcategoryName} budget (${payload.year}).`
    return true
  }

  mobileState.errorMessage = `Failed to save budget: ${res.error}`
  return false
}
