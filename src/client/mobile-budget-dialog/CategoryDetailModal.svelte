<script lang="ts">
  import { getSelectedCategoryDetail, mobileState } from '../states/mobile.svelte'
  import {
    formatCurrency,
    getCategoryMetricForMonth,
    MONTH_NAMES,
    SHORT_MONTH_NAMES,
  } from '../utils/mobile-budget'
  import SubcategoryBudgetEditor from './SubcategoryBudgetEditor.svelte'
  import TransactionCard from './TransactionCard.svelte'

  let activeView = $state<'insights' | 'edit'>('insights')

  const detail = $derived(getSelectedCategoryDetail())
  const categories = $derived(mobileState.dashboard?.categories ?? [])
  const selectedMonthName = $derived(MONTH_NAMES[mobileState.selectedMonth - 1] ?? '')

  const maxChartAmount = $derived.by(() => {
    if (!detail) return 1
    let maxVal = 1
    for (const m of detail.budget.months) {
      maxVal = Math.max(maxVal, Math.abs(m.actual), Math.abs(m.budget))
    }
    return maxVal
  })

  function closeDetail() {
    activeView = 'insights'
    mobileState.selectedCategoryName = null
  }
</script>

{#if detail}
  {@const currentMetric = getCategoryMetricForMonth(detail.budget, mobileState.selectedMonth)}
  <div class="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-xs">
    <div class="mx-auto flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-gray-50 shadow-2xl dark:bg-gray-950">
      <!-- Modal Header -->
      <div class="border-b border-gray-200 bg-white px-4 pt-3 pb-2.5 dark:border-gray-800 dark:bg-gray-900">
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="text-2xl">{detail.budget.icon}</span>
            <div class="min-w-0">
              <h3 class="truncate text-base font-bold text-gray-900 dark:text-white">{detail.budget.category}</h3>
              {#if detail.budget.description}
                <p class="truncate text-xs text-gray-500 dark:text-gray-400">{detail.budget.description}</p>
              {/if}
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onclick={closeDetail}
          >
            ✕ Close
          </button>
        </div>

        <!-- Sub-view Switcher: Insights & Transactions vs Edit Subcategory Budgets -->
        <div class="mt-3 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-0.5 text-xs font-medium dark:bg-gray-800">
          <button
            type="button"
            class="rounded-md py-1.5 transition-colors {activeView === 'insights' ? 'bg-white font-semibold text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
            onclick={() => (activeView = 'insights')}
          >
            📊 Insights &amp; Tx
          </button>
          <button
            type="button"
            class="rounded-md py-1.5 transition-colors {activeView === 'edit' ? 'bg-white font-semibold text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
            onclick={() => (activeView = 'edit')}
          >
            ✏️ Edit Budgets ({detail.subcategories.length})
          </button>
        </div>
      </div>

      <!-- Modal Scrollable Body -->
      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        {#if activeView === 'insights'}
          <!-- Selected Month Metric Cards -->
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-xl border border-gray-200 bg-white p-2.5 text-center dark:border-gray-800 dark:bg-gray-900">
              <p class="text-[11px] text-gray-500 dark:text-gray-400">{selectedMonthName} Actual</p>
              <p class="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                {formatCurrency(currentMetric.actual)}
              </p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-2.5 text-center dark:border-gray-800 dark:bg-gray-900">
              <p class="text-[11px] text-gray-500 dark:text-gray-400">{selectedMonthName} Budget</p>
              <p class="mt-0.5 text-sm font-bold text-gray-900 dark:text-white">
                {formatCurrency(currentMetric.budget)}
              </p>
            </div>
            <div class="rounded-xl border border-gray-200 bg-white p-2.5 text-center dark:border-gray-800 dark:bg-gray-900">
              <p class="text-[11px] text-gray-500 dark:text-gray-400">YTD Rollover</p>
              <p class="mt-0.5 text-sm font-bold {currentMetric.runningTotal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
                {currentMetric.runningTotal >= 0 ? '+' : ''}{formatCurrency(currentMetric.runningTotal)}
              </p>
            </div>
          </div>

          <!-- 12-Month Mini Trend Chart -->
          <div class="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs dark:border-gray-800 dark:bg-gray-900">
            <div class="mb-2 flex items-center justify-between text-xs">
              <span class="font-semibold text-gray-700 dark:text-gray-200">
                {mobileState.selectedYear} Trend (Tap month)
              </span>
              <div class="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                <span class="inline-flex items-center gap-1">
                  <span class="h-2 w-2 rounded-xs bg-blue-500"></span> Actual
                </span>
                <span class="inline-flex items-center gap-1">
                  <span class="h-2 w-2 rounded-xs bg-gray-300 dark:bg-gray-600"></span> Budget
                </span>
              </div>
            </div>

            <div class="grid grid-cols-12 items-end gap-1 pt-2" style="height: 108px;">
              {#each detail.budget.months as m (m.month)}
                {@const actualHeight = Math.max(4, Math.round((Math.abs(m.actual) / maxChartAmount) * 72))}
                {@const budgetHeight = Math.max(4, Math.round((Math.abs(m.budget) / maxChartAmount) * 72))}
                {@const isSelected = m.month === mobileState.selectedMonth}
                {@const isOver = m.budget < 0 && m.difference < 0}
                <button
                  type="button"
                  class="flex flex-col items-center rounded-md py-1 transition-colors {isSelected ? 'bg-blue-50 ring-1 ring-blue-300 dark:bg-blue-950/60 dark:ring-blue-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}"
                  onclick={() => (mobileState.selectedMonth = m.month)}
                  title="{SHORT_MONTH_NAMES[m.month - 1]}: Actual {formatCurrency(m.actual)} / Budget {formatCurrency(m.budget)}"
                >
                  <div class="flex h-18 items-end gap-0.5">
                    <div
                      class="w-1.5 rounded-t {isOver ? 'bg-rose-500' : 'bg-blue-500'}"
                      style="height: {actualHeight}px;"
                    ></div>
                    <div
                      class="w-1.5 rounded-t bg-gray-300 dark:bg-gray-600"
                      style="height: {budgetHeight}px;"
                    ></div>
                  </div>
                  <span class="mt-1 text-[10px] {isSelected ? 'font-bold text-blue-700 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}">
                    {SHORT_MONTH_NAMES[m.month - 1]}
                  </span>
                </button>
              {/each}
            </div>
          </div>

          <!-- Transactions in this Category for Selected Month -->
          <div class="space-y-2">
            <h4 class="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
              {selectedMonthName} {mobileState.selectedYear} Transactions ({detail.transactions.length})
            </h4>

            {#if detail.transactions.length === 0}
              <div class="rounded-xl border border-gray-200 bg-white p-4 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                No loaded transactions in {detail.budget.category} for {selectedMonthName} {mobileState.selectedYear}.
              </div>
            {:else}
              <div class="space-y-2">
                {#each detail.transactions as tx (tx.ref)}
                  <TransactionCard transaction={tx} {categories} />
                {/each}
              </div>
            {/if}
          </div>
        {:else}
          <SubcategoryBudgetEditor
            year={mobileState.selectedYear}
            category={detail.budget.category}
            subcategories={detail.subcategories}
          />
        {/if}
      </div>
    </div>
  </div>
{/if}
