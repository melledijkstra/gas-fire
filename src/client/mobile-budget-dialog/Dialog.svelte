<script lang="ts">
  import { onMount } from 'svelte'
  import Application from '../Application.svelte'
  import {
    loadMobileDashboard,
    mobileState,
    syncMobileBankTransactions,
  } from '../states/mobile.svelte'
  import { SHORT_MONTH_NAMES } from '../utils/mobile-budget'
  import BudgetsTab from './BudgetsTab.svelte'
  import CategoryDetailModal from './CategoryDetailModal.svelte'
  import OverviewTab from './OverviewTab.svelte'
  import TransactionsTab from './TransactionsTab.svelte'

  const availableYears = $derived(
    mobileState.dashboard?.availableYears ?? [mobileState.selectedYear],
  )
  const uncategorizedCount = $derived(mobileState.dashboard?.uncategorizedCount ?? 0)

  onMount(async () => {
    await loadMobileDashboard()
  })

  function previousMonth() {
    if (mobileState.selectedMonth > 1) {
      mobileState.selectedMonth -= 1
    }
    else {
      const prevYear = mobileState.selectedYear - 1
      if (availableYears.includes(prevYear)) {
        mobileState.selectedYear = prevYear
        mobileState.selectedMonth = 12
      }
    }
  }

  function nextMonth() {
    if (mobileState.selectedMonth < 12) {
      mobileState.selectedMonth += 1
    }
    else {
      const nxtYear = mobileState.selectedYear + 1
      if (availableYears.includes(nxtYear)) {
        mobileState.selectedYear = nxtYear
        mobileState.selectedMonth = 1
      }
    }
  }
</script>

<Application>
  <div class="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50">
    <!-- Sticky Top Header -->
    <header class="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-3 py-2.5 backdrop-blur-xs">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5">
          <span class="text-lg">💶</span>
          <h1 class="text-sm font-bold tracking-tight text-gray-900">YMYL Budget</h1>
        </div>

        <!-- Month / Year Switcher -->
        <div class="flex items-center gap-1 rounded-lg bg-gray-100 p-0.5 text-xs">
          <button
            type="button"
            class="rounded-md px-2 py-1 font-bold text-gray-600 hover:bg-white hover:text-gray-900"
            onclick={previousMonth}
            aria-label="Previous month"
          >
            ‹
          </button>

          <select
            aria-label="Select month"
            class="bg-transparent py-0.5 pr-1 pl-1 font-semibold text-gray-900 focus:outline-none"
            bind:value={mobileState.selectedMonth}
          >
            {#each SHORT_MONTH_NAMES as mName, idx (mName)}
              <option value={idx + 1}>{mName}</option>
            {/each}
          </select>

          <select
            aria-label="Select year"
            class="bg-transparent py-0.5 pr-1 pl-0.5 font-semibold text-gray-900 focus:outline-none"
            bind:value={mobileState.selectedYear}
          >
            {#each availableYears as yr (yr)}
              <option value={yr}>{yr}</option>
            {/each}
          </select>

          <button
            type="button"
            class="rounded-md px-2 py-1 font-bold text-gray-600 hover:bg-white hover:text-gray-900"
            onclick={nextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <!-- Sync Bank Button -->
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50"
          disabled={mobileState.isSyncing || mobileState.isLoading}
          onclick={syncMobileBankTransactions}
        >
          <span>{mobileState.isSyncing ? '⏳' : '🔄'}</span>
          <span>{mobileState.isSyncing ? 'Syncing' : 'Sync'}</span>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 px-3 pt-3 pb-20">
      {#if mobileState.errorMessage}
        <div class="mb-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <span>{mobileState.errorMessage}</span>
          <button
            type="button"
            class="ml-2 font-bold text-rose-600"
            onclick={() => (mobileState.errorMessage = null)}
          >
            ✕
          </button>
        </div>
      {/if}

      {#if mobileState.statusMessage}
        <div class="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          <span>{mobileState.statusMessage}</span>
          <button
            type="button"
            class="ml-2 font-bold text-emerald-600"
            onclick={() => (mobileState.statusMessage = null)}
          >
            ✕
          </button>
        </div>
      {/if}

      {#if mobileState.isLoading && !mobileState.dashboard}
        <div class="space-y-3 py-6">
          <div class="h-24 animate-pulse rounded-xl bg-gray-200"></div>
          <div class="h-32 animate-pulse rounded-xl bg-gray-200"></div>
          <div class="h-48 animate-pulse rounded-xl bg-gray-200"></div>
        </div>
      {:else if mobileState.activeTab === 'overview'}
        <OverviewTab />
      {:else if mobileState.activeTab === 'budgets'}
        <BudgetsTab />
      {:else if mobileState.activeTab === 'transactions'}
        <TransactionsTab />
      {/if}
    </main>

    <!-- Category Detail Drawer / Modal -->
    <CategoryDetailModal />

    <!-- Sticky Bottom 3-Tab Navigation -->
    <nav class="fixed right-0 bottom-0 left-0 z-30 mx-auto max-w-md border-t border-gray-200 bg-white/95 backdrop-blur-xs">
      <div class="grid grid-cols-3">
        <button
          type="button"
          class="flex flex-col items-center justify-center py-2 text-xs transition-colors {mobileState.activeTab === 'overview' ? 'font-bold text-blue-600' : 'font-medium text-gray-500 hover:text-gray-900'}"
          onclick={() => (mobileState.activeTab = 'overview')}
        >
          <span class="text-base">📊</span>
          <span class="mt-0.5">Overview</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center justify-center py-2 text-xs transition-colors {mobileState.activeTab === 'budgets' ? 'font-bold text-blue-600' : 'font-medium text-gray-500 hover:text-gray-900'}"
          onclick={() => (mobileState.activeTab = 'budgets')}
        >
          <span class="text-base">🎯</span>
          <span class="mt-0.5">Budgets</span>
        </button>

        <button
          type="button"
          class="relative flex flex-col items-center justify-center py-2 text-xs transition-colors {mobileState.activeTab === 'transactions' ? 'font-bold text-blue-600' : 'font-medium text-gray-500 hover:text-gray-900'}"
          onclick={() => (mobileState.activeTab = 'transactions')}
        >
          <div class="relative">
            <span class="text-base">🧾</span>
            {#if uncategorizedCount > 0}
              <span class="absolute -top-1 -right-3.5 inline-flex items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {uncategorizedCount}
              </span>
            {/if}
          </div>
          <span class="mt-0.5">Transactions</span>
        </button>
      </div>
    </nav>
  </div>
</Application>
