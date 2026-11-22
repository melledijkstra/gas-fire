<script lang="ts">
  import type { MobileCategoryBudget } from '@/common/types'
  import { getSelectedYearBudgets, mobileState } from '../states/mobile.svelte'
  import { formatCurrency, getCategoryMetricForMonth, MONTH_NAMES } from '../utils/mobile-budget'

  const budgets = $derived(getSelectedYearBudgets())
  const monthName = $derived(MONTH_NAMES[mobileState.selectedMonth - 1] ?? '')
  const subcategoriesByCategory = $derived(
    mobileState.dashboard?.subcategoriesByYear[mobileState.selectedYear] ?? {},
  )

  function selectCategory(item: MobileCategoryBudget) {
    mobileState.selectedCategoryName = item.category
  }

  function isIncomeCategory(budget: number, actual: number, categoryName: string): boolean {
    if (budget > 0 || (budget === 0 && actual > 0)) return true
    return categoryName === 'Income' || categoryName === 'Salary'
  }
</script>

<div class="space-y-3 pb-4">
  <!-- Mode Switcher: Monthly vs YTD Running Total -->
  <div class="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-2 shadow-xs dark:border-gray-800 dark:bg-gray-900">
    <span class="px-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
      {monthName} {mobileState.selectedYear}
    </span>
    <div class="inline-flex rounded-lg bg-gray-100 p-0.5 text-xs font-medium dark:bg-gray-800">
      <button
        type="button"
        class="rounded-md px-2.5 py-1 transition-colors {mobileState.budgetViewMode === 'monthly' ? 'bg-white font-semibold text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
        onclick={() => (mobileState.budgetViewMode = 'monthly')}
      >
        Monthly
      </button>
      <button
        type="button"
        class="rounded-md px-2.5 py-1 transition-colors {mobileState.budgetViewMode === 'ytd' ? 'bg-white font-semibold text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
        onclick={() => (mobileState.budgetViewMode = 'ytd')}
      >
        YTD Rollover
      </button>
    </div>
  </div>

  <!-- Flat list of all 20 categories in exact sheet order -->
  <div class="space-y-2">
    {#each budgets as item (item.category)}
      {@const metric = getCategoryMetricForMonth(item, mobileState.selectedMonth)}
      {@const isIncome = isIncomeCategory(metric.budget, metric.actual, item.category)}
      {@const absActual = Math.abs(metric.actual)}
      {@const absBudget = Math.abs(metric.budget)}
      {@const pct = absBudget > 0 ? Math.min(100, Math.round((absActual / absBudget) * 100)) : (absActual > 0 ? 100 : 0)}
      {@const primaryDelta = mobileState.budgetViewMode === 'monthly' ? metric.difference : metric.runningTotal}
      {@const subCount = (subcategoriesByCategory[item.category] ?? []).length}

      <button
        type="button"
        class="block w-full rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xs transition-colors hover:border-blue-300 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-600"
        onclick={() => selectCategory(item)}
      >
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2.5">
            <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-base dark:bg-gray-800">
              {item.icon}
            </span>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{item.category}</p>
                {#if subCount > 0}
                  <span class="shrink-0 rounded bg-gray-100 px-1.5 py-0.2 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    {subCount}
                  </span>
                {/if}
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {#if isIncome}
                  Received {formatCurrency(metric.actual)} of {formatCurrency(metric.budget)}
                {:else}
                  Spent {formatCurrency(absActual)} of {formatCurrency(absBudget)}
                {/if}
              </p>
            </div>
          </div>

          <div class="shrink-0 text-right">
            <span
              class="inline-block rounded-md px-2 py-0.5 text-xs font-bold {primaryDelta >= 0 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'}"
            >
              {primaryDelta >= 0 ? '+' : ''}{formatCurrency(primaryDelta)}
            </span>
            <p class="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500">
              {mobileState.budgetViewMode === 'monthly'
                ? `YTD: ${metric.runningTotal >= 0 ? '+' : ''}${formatCurrency(metric.runningTotal)}`
                : `Month: ${metric.difference >= 0 ? '+' : ''}${formatCurrency(metric.difference)}`}
            </p>
          </div>
        </div>

        <div class="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
          <div
            class="h-full rounded-full transition-all {isIncome
              ? 'bg-emerald-500'
              : metric.difference < 0
                ? 'bg-rose-500'
                : pct > 85
                  ? 'bg-amber-500'
                  : 'bg-blue-500'}"
            style="width: {pct}%"
          ></div>
        </div>
      </button>
    {/each}
  </div>
</div>
