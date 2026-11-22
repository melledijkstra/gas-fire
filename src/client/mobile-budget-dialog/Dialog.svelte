<script lang="ts">
  import { onMount } from 'svelte'
  import Application from '../Application.svelte'
  import {
    loadMobileDashboard,
    mobileState,
    syncMobileBankTransactions,
  } from '../states/mobile.svelte'
  import { cycleThemePreference, initTheme, themeState } from '../states/theme.svelte'
  import { SHORT_MONTH_NAMES } from '../utils/mobile-budget'
  import BudgetsTab from './BudgetsTab.svelte'
  import CategoryDetailModal from './CategoryDetailModal.svelte'
  import OverviewTab from './OverviewTab.svelte'
  import TransactionsTab from './TransactionsTab.svelte'

  const availableYears = $derived(
    mobileState.dashboard?.availableYears ?? [mobileState.selectedYear],
  )
  const uncategorizedCount = $derived(mobileState.dashboard?.uncategorizedCount ?? 0)

  const themeIcon = $derived(
    themeState.preference === 'dark'
      ? '🌙'
      : themeState.preference === 'light'
        ? '☀️'
        : '◐',
  )
  const themeTitle = $derived(
    themeState.preference === 'dark'
      ? 'Theme: Dark (tap to switch)'
      : themeState.preference === 'light'
        ? 'Theme: Light (tap to switch)'
        : 'Theme: Auto (tap to switch)',
  )

  onMount(() => {
    const cleanupTheme = initTheme()
    void loadMobileDashboard()
    return cleanupTheme
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
  <div class="mx-auto flex min-h-screen max-w-md flex-col bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
    <!-- Sticky Top Header -->
    <header class="sticky top-0 z-30 border-b border-gray-200 bg-white/95 px-3 py-2.5 backdrop-blur-xs dark:border-gray-800 dark:bg-gray-900/95">
      <div class="flex items-center justify-between gap-1.5">
        <div class="flex items-center gap-1">
          <span class="text-base">💶</span>
          <h1 class="text-sm font-bold tracking-tight text-gray-900 dark:text-gray-100">YMYL</h1>
        </div>

        <!-- Shared Month / Year Switcher -->
        <div class="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 text-xs dark:bg-gray-800">
          <button
            type="button"
            class="rounded-md px-1.5 py-1 font-bold text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            onclick={previousMonth}
            aria-label="Previous month"
          >
            ‹
          </button>

          <select
            aria-label="Select month"
            class="bg-transparent py-0.5 pr-0.5 pl-1 font-semibold text-gray-900 focus:outline-none dark:text-gray-100"
            bind:value={mobileState.selectedMonth}
          >
            {#each SHORT_MONTH_NAMES as mName, idx (mName)}
              <option value={idx + 1} class="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                {mName}
              </option>
            {/each}
          </select>

          <select
            aria-label="Select year"
            class="bg-transparent py-0.5 pr-1 pl-0.5 font-semibold text-gray-900 focus:outline-none dark:text-gray-100"
            bind:value={mobileState.selectedYear}
          >
            {#each availableYears as yr (yr)}
              <option value={yr} class="bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
                {yr}
              </option>
            {/each}
          </select>

          <button
            type="button"
            class="rounded-md px-1.5 py-1 font-bold text-gray-600 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
            onclick={nextMonth}
            aria-label="Next month"
          >
            ›
          </button>
        </div>

        <!-- Theme Toggle + Bank Sync -->
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            class="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 text-xs text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            onclick={cycleThemePreference}
            title={themeTitle}
            aria-label={themeTitle}
          >
            {themeIcon}
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-60"
            disabled={mobileState.isSyncing || mobileState.isLoading}
            onclick={syncMobileBankTransactions}
          >
            {#if mobileState.isSyncing}
              <svg class="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
              <span>Syncing</span>
            {:else}
              <span>🔄</span>
              <span>Sync</span>
            {/if}
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 px-3 pt-3 pb-20">
      {#if mobileState.isSyncing}
        <div class="mb-3 flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/60 dark:text-blue-200">
          <svg class="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Syncing bank accounts &amp; refreshing dashboard…</span>
        </div>
      {/if}

      {#if mobileState.errorMessage}
        <div class="mb-3 flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/60 dark:text-rose-200">
          <span>{mobileState.errorMessage}</span>
          <button
            type="button"
            class="ml-2 font-bold text-rose-600 dark:text-rose-300"
            onclick={() => (mobileState.errorMessage = null)}
          >
            ✕
          </button>
        </div>
      {/if}

      {#if mobileState.statusMessage}
        <div class="mb-3 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/60 dark:text-emerald-200">
          <span>{mobileState.statusMessage}</span>
          <button
            type="button"
            class="ml-2 font-bold text-emerald-600 dark:text-emerald-300"
            onclick={() => (mobileState.statusMessage = null)}
          >
            ✕
          </button>
        </div>
      {/if}

      {#if mobileState.isLoading && !mobileState.dashboard}
        <div class="space-y-3 py-6">
          <div class="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          <div class="h-28 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          <div class="h-44 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800"></div>
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
    <nav class="fixed right-0 bottom-0 left-0 z-30 mx-auto max-w-md border-t border-gray-200 bg-white/95 backdrop-blur-xs dark:border-gray-800 dark:bg-gray-900/95">
      <div class="grid grid-cols-3">
        <button
          type="button"
          class="flex flex-col items-center justify-center py-2 text-xs transition-colors {mobileState.activeTab === 'overview' ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
          onclick={() => (mobileState.activeTab = 'overview')}
        >
          <span class="text-base">📊</span>
          <span class="mt-0.5">Overview</span>
        </button>

        <button
          type="button"
          class="flex flex-col items-center justify-center py-2 text-xs transition-colors {mobileState.activeTab === 'budgets' ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
          onclick={() => (mobileState.activeTab = 'budgets')}
        >
          <span class="text-base">🎯</span>
          <span class="mt-0.5">Budgets</span>
        </button>

        <button
          type="button"
          class="relative flex flex-col items-center justify-center py-2 text-xs transition-colors {mobileState.activeTab === 'transactions' ? 'font-bold text-blue-600 dark:text-blue-400' : 'font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
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
