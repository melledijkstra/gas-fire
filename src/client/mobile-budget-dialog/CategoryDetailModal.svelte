<script lang="ts">
  import { getSelectedCategoryDetail, mobileState } from '../states/mobile.svelte'
  import {
    formatCurrency,
    getCategoryMetricForMonth,
    MONTH_NAMES,
    SHORT_MONTH_NAMES,
  } from '../utils/mobile-budget'
  import TransactionCard from './TransactionCard.svelte'

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
    mobileState.selectedCategoryName = null
  }
</script>

{#if detail}
  {@const currentMetric = getCategoryMetricForMonth(detail.budget, mobileState.selectedMonth)}
  <div class="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-xs">
    <div class="flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-gray-50 shadow-2xl">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
        <div class="flex min-w-0 items-center gap-2.5">
          <span class="text-2xl">{detail.budget.icon}</span>
          <div class="min-w-0">
            <h3 class="truncate text-base font-bold text-gray-900">{detail.budget.category}</h3>
            {#if detail.budget.description}
              <p class="truncate text-xs text-gray-500">{detail.budget.description}</p>
            {/if}
          </div>
        </div>
        <button
          type="button"
          class="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200"
          onclick={closeDetail}
        >
          ✕ Close
        </button>
      </div>

      <!-- Modal Scrollable Body -->
      <div class="flex-1 space-y-4 overflow-y-auto p-4">
        <!-- Selected Month Metric Cards -->
        <div class="grid grid-cols-3 gap-2">
          <div class="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
            <p class="text-[11px] text-gray-500">{selectedMonthName} Actual</p>
            <p class="mt-0.5 text-sm font-bold text-gray-900">
              {formatCurrency(currentMetric.actual)}
            </p>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
            <p class="text-[11px] text-gray-500">{selectedMonthName} Budget</p>
            <p class="mt-0.5 text-sm font-bold text-gray-900">
              {formatCurrency(currentMetric.budget)}
            </p>
          </div>
          <div class="rounded-xl border border-gray-200 bg-white p-2.5 text-center">
            <p class="text-[11px] text-gray-500">YTD Rollover</p>
            <p class="mt-0.5 text-sm font-bold {currentMetric.runningTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
              {currentMetric.runningTotal >= 0 ? '+' : ''}{formatCurrency(currentMetric.runningTotal)}
            </p>
          </div>
        </div>

        <!-- 12-Month Mini Trend Chart -->
        <div class="rounded-xl border border-gray-200 bg-white p-3.5 shadow-xs">
          <div class="mb-2 flex items-center justify-between text-xs">
            <span class="font-semibold text-gray-700">
              {mobileState.selectedYear} Monthly Trend (Tap month to inspect)
            </span>
            <div class="flex items-center gap-2 text-[11px] text-gray-500">
              <span class="inline-flex items-center gap-1">
                <span class="h-2 w-2 rounded-xs bg-blue-500"></span> Actual
              </span>
              <span class="inline-flex items-center gap-1">
                <span class="h-2 w-2 rounded-xs bg-gray-300"></span> Budget
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
                class="flex flex-col items-center rounded-md py-1 transition-colors {isSelected ? 'bg-blue-50 ring-1 ring-blue-300' : 'hover:bg-gray-50'}"
                onclick={() => (mobileState.selectedMonth = m.month)}
                title="{SHORT_MONTH_NAMES[m.month - 1]}: Actual {formatCurrency(m.actual)} / Budget {formatCurrency(m.budget)}"
              >
                <div class="flex h-18 items-end gap-0.5">
                  <div
                    class="w-1.5 rounded-t {isOver ? 'bg-rose-500' : 'bg-blue-500'}"
                    style="height: {actualHeight}px;"
                  ></div>
                  <div
                    class="w-1.5 rounded-t bg-gray-300"
                    style="height: {budgetHeight}px;"
                  ></div>
                </div>
                <span class="mt-1 text-[10px] {isSelected ? 'font-bold text-blue-700' : 'text-gray-500'}">
                  {SHORT_MONTH_NAMES[m.month - 1]}
                </span>
              </button>
            {/each}
          </div>
        </div>

        <!-- Transactions in this Category for Selected Month -->
        <div class="space-y-2">
          <h4 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
            {selectedMonthName} {mobileState.selectedYear} Transactions ({detail.transactions.length})
          </h4>

          {#if detail.transactions.length === 0}
            <div class="rounded-xl border border-gray-200 bg-white p-4 text-center text-xs text-gray-500">
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
      </div>
    </div>
  </div>
{/if}
