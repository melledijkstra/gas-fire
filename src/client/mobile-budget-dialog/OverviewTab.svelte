<script lang="ts">
  import {
    getMonthlyExpenseSummary,
    getOverBudgetCategories,
    getSelectedYearBudgets,
    mobileState,
  } from '../states/mobile.svelte'
  import {
    formatCurrency,
    getCategoryMetricForMonth,
    MONTH_NAMES,
  } from '../utils/mobile-budget'

  let showAccounts = $state(false)

  const dashboard = $derived(mobileState.dashboard)
  const uncategorizedCount = $derived(dashboard?.uncategorizedCount ?? 0)
  const overBudgetList = $derived(getOverBudgetCategories())
  const expenseSummary = $derived(getMonthlyExpenseSummary())
  const monthLabel = $derived(MONTH_NAMES[mobileState.selectedMonth - 1] ?? '')

  const headlineNetWorth = $derived(
    dashboard?.netWorth.netWorth ?? dashboard?.totalLiquidBalance ?? 0,
  )

  const topActiveExpenseBudgets = $derived.by(() => {
    const all = getSelectedYearBudgets()
    return all
      .filter((item) => {
        const m = getCategoryMetricForMonth(item, mobileState.selectedMonth)
        return m.budget < 0 || m.actual < 0
      })
      .slice(0, 5)
  })

  function goToUncategorized() {
    mobileState.transactionFilter = 'uncategorized'
    mobileState.activeTab = 'transactions'
  }

  function openCategory(categoryName: string) {
    mobileState.selectedCategoryName = categoryName
  }
</script>

<div class="space-y-4 pb-4">
  <!-- In-App Alerts Section -->
  <section class="space-y-2">
    {#if uncategorizedCount > 0}
      <div class="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 shadow-xs dark:border-amber-700/60 dark:bg-amber-950/50 dark:text-amber-100">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">⛔</span>
          <div>
            <p class="text-sm font-semibold">
              {uncategorizedCount} uncategorized {uncategorizedCount === 1 ? 'transaction' : 'transactions'}
            </p>
            <p class="text-xs text-amber-700 dark:text-amber-300">Review and assign categories to keep your budget accurate.</p>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
          onclick={goToUncategorized}
        >
          Review →
        </button>
      </div>
    {/if}

    {#if overBudgetList.length > 0}
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-900 shadow-xs dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-100">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-semibold">
            ⚠️ {overBudgetList.length} {overBudgetList.length === 1 ? 'category' : 'categories'} over budget in {monthLabel}
          </p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each overBudgetList as item (item.category)}
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:bg-gray-900 dark:text-rose-200 dark:hover:bg-rose-950"
              onclick={() => openCategory(item.category)}
            >
              <span>{item.icon} {item.category}</span>
              <span class="font-bold text-rose-600 dark:text-rose-400">({formatCurrency(item.difference)})</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if uncategorizedCount === 0 && overBudgetList.length === 0}
      <div class="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-100">
        <span class="text-lg">✅</span>
        <p class="text-xs font-medium">
          All transactions categorized and all {monthLabel} budgets on track!
        </p>
      </div>
    {/if}
  </section>

  <!-- Net Worth & Accounts Hero Card -->
  {#if dashboard}
    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
      <div class="flex items-baseline justify-between">
        <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
          Net Worth
        </h3>
        <span class="text-xs text-gray-400 dark:text-gray-500">Total Wealth</span>
      </div>

      <p class="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
        {formatCurrency(headlineNetWorth)}
      </p>

      <!-- Wealth Breakdown Grid -->
      <div class="mt-3 grid grid-cols-2 gap-2">
        <div class="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/60">
          <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Liquid Assets</p>
          <p class="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
            {formatCurrency(dashboard.netWorth.liquidAssets)}
          </p>
        </div>

        <div class="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/60">
          <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Investments</p>
          <p class="mt-0.5 text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {dashboard.netWorth.investments !== null ? formatCurrency(dashboard.netWorth.investments) : '—'}
          </p>
        </div>

        <div class="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/60">
          <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Capital</p>
          <p class="mt-0.5 text-sm font-bold text-gray-900 dark:text-gray-100">
            {dashboard.netWorth.capital !== null ? formatCurrency(dashboard.netWorth.capital) : '—'}
          </p>
        </div>

        <div class="rounded-lg border border-gray-100 bg-gray-50 p-2.5 dark:border-gray-800 dark:bg-gray-800/60">
          <p class="text-[11px] font-medium text-gray-500 dark:text-gray-400">Debt</p>
          <p class="mt-0.5 text-sm font-bold {(dashboard.netWorth.debt ?? 0) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-gray-100'}">
            {dashboard.netWorth.debt !== null ? formatCurrency(dashboard.netWorth.debt) : '—'}
          </p>
        </div>
      </div>

      <!-- Expandable Individual Liquid Bank Accounts -->
      <div class="mt-3 border-t border-gray-100 pt-2.5 dark:border-gray-800">
        <button
          type="button"
          class="flex w-full items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
          onclick={() => (showAccounts = !showAccounts)}
        >
          <span>Bank Accounts ({dashboard.accounts.length})</span>
          <span class="text-[11px] text-gray-400">{showAccounts ? 'Hide ▲' : 'Show ▼'}</span>
        </button>

        {#if showAccounts}
          {#if dashboard.accounts.length === 0}
            <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">No bank accounts found in accounts named range.</p>
          {:else}
            <div class="mt-2 space-y-1.5">
              {#each dashboard.accounts as account (account.slug)}
                <div class="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-2 text-xs dark:bg-gray-800/50">
                  <span class="truncate font-medium text-gray-700 dark:text-gray-200">{account.label}</span>
                  <span class="font-bold text-gray-900 dark:text-white">{formatCurrency(account.balance)}</span>
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </section>
  {/if}

  <!-- Monthly Spend Summary Card -->
  <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
    <div class="flex items-baseline justify-between">
      <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        {monthLabel} {mobileState.selectedYear} Outflows
      </h3>
      <span class="text-xs font-medium {expenseSummary.remainingExpenseBudget >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">
        {expenseSummary.remainingExpenseBudget >= 0
          ? `${formatCurrency(expenseSummary.remainingExpenseBudget)} remaining`
          : `${formatCurrency(Math.abs(expenseSummary.remainingExpenseBudget))} over budget`}
      </span>
    </div>

    <div class="mt-2 flex items-baseline gap-2">
      <span class="text-2xl font-bold text-gray-900 dark:text-white">
        {formatCurrency(Math.abs(expenseSummary.totalActualExpense))}
      </span>
      <span class="text-xs text-gray-500 dark:text-gray-400">
        of {formatCurrency(Math.abs(expenseSummary.totalBudgetedExpense))} budgeted ({expenseSummary.utilizationPercent}%)
      </span>
    </div>

    <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
      <div
        class="h-full rounded-full transition-all {expenseSummary.remainingExpenseBudget < 0 ? 'bg-rose-500' : expenseSummary.utilizationPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'}"
        style="width: {expenseSummary.utilizationPercent}%"
      ></div>
    </div>
  </section>

  <!-- Top Categories Preview -->
  <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs dark:border-gray-800 dark:bg-gray-900">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
        Key {monthLabel} Budgets
      </h3>
      <button
        type="button"
        class="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
        onclick={() => (mobileState.activeTab = 'budgets')}
      >
        All {dashboard?.categories.length ?? 20} categories →
      </button>
    </div>

    <div class="space-y-3">
      {#each topActiveExpenseBudgets as item (item.category)}
        {@const metric = getCategoryMetricForMonth(item, mobileState.selectedMonth)}
        {@const absActual = Math.abs(metric.actual)}
        {@const absBudget = Math.abs(metric.budget)}
        {@const pct = absBudget > 0 ? Math.min(100, Math.round((absActual / absBudget) * 100)) : (absActual > 0 ? 100 : 0)}
        <button
          type="button"
          class="block w-full text-left"
          onclick={() => openCategory(item.category)}
        >
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-gray-800 dark:text-gray-200">{item.icon} {item.category}</span>
            <span class="font-semibold {metric.difference < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-700 dark:text-gray-300'}">
              {formatCurrency(absActual)} / {formatCurrency(absBudget)}
            </span>
          </div>
          <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div
              class="h-full rounded-full {metric.difference < 0 ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-blue-500'}"
              style="width: {pct}%"
            ></div>
          </div>
        </button>
      {/each}
    </div>
  </section>
</div>
