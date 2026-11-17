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

  let copiedUrl = $state(false)

  const dashboard = $derived(mobileState.dashboard)
  const uncategorizedCount = $derived(dashboard?.uncategorizedCount ?? 0)
  const overBudgetList = $derived(getOverBudgetCategories())
  const expenseSummary = $derived(getMonthlyExpenseSummary())
  const monthLabel = $derived(MONTH_NAMES[mobileState.selectedMonth - 1] ?? '')

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

  async function copyWebAppUrl() {
    if (!dashboard?.webAppUrl) return
    try {
      await navigator.clipboard.writeText(dashboard.webAppUrl)
      copiedUrl = true
      setTimeout(() => (copiedUrl = false), 2500)
    }
    catch {
      // Fallback if clipboard permission denied inside iframe
    }
  }
</script>

<div class="space-y-4 pb-4">
  <!-- In-App Alerts Section -->
  <section class="space-y-2">
    {#if uncategorizedCount > 0}
      <div class="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-amber-900 shadow-xs">
        <div class="flex items-center gap-2.5">
          <span class="text-xl">⛔</span>
          <div>
            <p class="text-sm font-semibold">
              {uncategorizedCount} uncategorized {uncategorizedCount === 1 ? 'transaction' : 'transactions'}
            </p>
            <p class="text-xs text-amber-700">Review and assign categories to keep your budget accurate.</p>
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
      <div class="rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-rose-900 shadow-xs">
        <div class="mb-2 flex items-center justify-between">
          <p class="text-sm font-semibold">
            ⚠️ {overBudgetList.length} {overBudgetList.length === 1 ? 'category' : 'categories'} over budget in {monthLabel}
          </p>
        </div>
        <div class="flex flex-wrap gap-1.5">
          {#each overBudgetList as item (item.category)}
            <button
              type="button"
              class="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100"
              onclick={() => openCategory(item.category)}
            >
              <span>{item.icon} {item.category}</span>
              <span class="font-bold text-rose-600">({formatCurrency(item.difference)})</span>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    {#if uncategorizedCount === 0 && overBudgetList.length === 0}
      <div class="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900">
        <span class="text-lg">✅</span>
        <p class="text-xs font-medium">
          All transactions categorized and all {monthLabel} budgets on track!
        </p>
      </div>
    {/if}
  </section>

  <!-- Monthly Spend Summary Card -->
  <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
    <div class="flex items-baseline justify-between">
      <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
        {monthLabel} {mobileState.selectedYear} Outflows
      </h3>
      <span class="text-xs font-medium {expenseSummary.remainingExpenseBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
        {expenseSummary.remainingExpenseBudget >= 0
          ? `${formatCurrency(expenseSummary.remainingExpenseBudget)} remaining`
          : `${formatCurrency(Math.abs(expenseSummary.remainingExpenseBudget))} over budget`}
      </span>
    </div>

    <div class="mt-2 flex items-baseline gap-2">
      <span class="text-2xl font-bold text-gray-900">
        {formatCurrency(Math.abs(expenseSummary.totalActualExpense))}
      </span>
      <span class="text-xs text-gray-500">
        of {formatCurrency(Math.abs(expenseSummary.totalBudgetedExpense))} budgeted ({expenseSummary.utilizationPercent}%)
      </span>
    </div>

    <div class="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
      <div
        class="h-full rounded-full transition-all {expenseSummary.remainingExpenseBudget < 0 ? 'bg-rose-500' : expenseSummary.utilizationPercent > 85 ? 'bg-amber-500' : 'bg-emerald-500'}"
        style="width: {expenseSummary.utilizationPercent}%"
      ></div>
    </div>
  </section>

  <!-- Bank Account Balances -->
  {#if dashboard}
    <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
      <div class="mb-3 flex items-baseline justify-between">
        <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
          Liquid Accounts
        </h3>
        <span class="text-sm font-bold text-gray-900">
          {formatCurrency(dashboard.totalLiquidBalance)}
        </span>
      </div>

      {#if dashboard.accounts.length === 0}
        <p class="text-xs text-gray-500">No bank accounts found in dashboard named range.</p>
      {:else}
        <div class="grid grid-cols-2 gap-2">
          {#each dashboard.accounts as account (account.slug)}
            <div class="rounded-lg border border-gray-100 bg-gray-50 p-2.5">
              <p class="truncate text-xs font-medium text-gray-600">{account.label}</p>
              <p class="mt-0.5 text-sm font-bold text-gray-900">
                {formatCurrency(account.balance)}
              </p>
            </div>
          {/each}
        </div>
      {/if}
    </section>
  {/if}

  <!-- Top Categories Preview -->
  <section class="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
    <div class="mb-3 flex items-center justify-between">
      <h3 class="text-xs font-semibold tracking-wider text-gray-500 uppercase">
        Key {monthLabel} Budgets
      </h3>
      <button
        type="button"
        class="text-xs font-semibold text-blue-600 hover:underline"
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
            <span class="font-medium text-gray-800">{item.icon} {item.category}</span>
            <span class="font-semibold {metric.difference < 0 ? 'text-rose-600' : 'text-gray-700'}">
              {formatCurrency(absActual)} / {formatCurrency(absBudget)}
            </span>
          </div>
          <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              class="h-full rounded-full {metric.difference < 0 ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-blue-500'}"
              style="width: {pct}%"
            ></div>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- Direct Mobile Web App Link Helper -->
  {#if dashboard?.webAppUrl}
    <section class="rounded-xl border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-900">
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0">
          <p class="font-semibold">📱 Direct Phone Web App Link</p>
          <p class="truncate text-[11px] text-blue-700">{dashboard.webAppUrl}</p>
        </div>
        <div class="flex shrink-0 gap-1.5">
          <button
            type="button"
            class="rounded-lg border border-blue-300 bg-white px-2.5 py-1 font-semibold text-blue-700 hover:bg-blue-100"
            onclick={copyWebAppUrl}
          >
            {copiedUrl ? 'Copied!' : 'Copy'}
          </button>
          <a
            href={dashboard.webAppUrl}
            target="_blank"
            rel="noreferrer"
            class="rounded-lg bg-blue-600 px-2.5 py-1 font-semibold text-white hover:bg-blue-700"
          >
            Open ↗
          </a>
        </div>
      </div>
    </section>
  {/if}
</div>
