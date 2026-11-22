<script lang="ts">
  import type { MobileTransaction } from '@/common/types'
  import {
    getFilteredTransactions,
    loadMoreMobileTransactions,
    mobileState,
  } from '../states/mobile.svelte'
  import TransactionCard from './TransactionCard.svelte'
  import VirtualList from './VirtualList.svelte'

  const filtered = $derived(getFilteredTransactions())
  const categories = $derived(mobileState.dashboard?.categories ?? [])
  const uncategorizedCount = $derived(mobileState.dashboard?.uncategorizedCount ?? 0)
  const totalLoadedCount = $derived(mobileState.dashboard?.transactions.length ?? 0)
  const totalTransactionCount = $derived(mobileState.dashboard?.totalTransactionCount ?? totalLoadedCount)
  const hasMoreTransactions = $derived(mobileState.dashboard?.hasMoreTransactions ?? false)

  function getTxKey(tx: MobileTransaction): string {
    return tx.ref
  }
</script>

<div class="space-y-3 pb-4">
  <!-- Filter & Search Controls -->
  <div class="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xs dark:border-gray-800 dark:bg-gray-900">
    <div class="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-xs font-medium dark:bg-gray-800">
      <button
        type="button"
        class="rounded-md py-1.5 transition-colors {mobileState.transactionFilter === 'uncategorized' ? 'bg-white font-semibold text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
        onclick={() => (mobileState.transactionFilter = 'uncategorized')}
      >
        ⛔ Uncategorized ({uncategorizedCount})
      </button>
      <button
        type="button"
        class="rounded-md py-1.5 transition-colors {mobileState.transactionFilter === 'all' ? 'bg-white font-semibold text-gray-900 shadow-xs dark:bg-gray-700 dark:text-white' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
        onclick={() => (mobileState.transactionFilter = 'all')}
      >
        📋 All ({totalLoadedCount}{#if totalTransactionCount > totalLoadedCount}/{totalTransactionCount}{/if})
      </button>
    </div>

    <div class="relative">
      <input
        type="search"
        placeholder="Search merchant, description, comment, category..."
        class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-500 dark:focus:bg-gray-900"
        bind:value={mobileState.searchQuery}
      />
    </div>
  </div>

  <!-- Virtualized Transactions List -->
  {#if filtered.length === 0}
    <div class="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-800 dark:bg-gray-900">
      {#if mobileState.transactionFilter === 'uncategorized' && !mobileState.searchQuery}
        <p class="text-2xl">🎉</p>
        <p class="mt-2 text-sm font-semibold text-gray-900 dark:text-white">Inbox Zero!</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Every transaction in your sheet has a category assigned.
        </p>
        <button
          type="button"
          class="mt-3 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900"
          onclick={() => (mobileState.transactionFilter = 'all')}
        >
          View All Transactions
        </button>
      {:else}
        <p class="text-sm font-medium text-gray-700 dark:text-gray-200">No matching transactions found.</p>
        <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Try clearing your search or loading more rows below.</p>
      {/if}
    </div>
  {:else}
    <VirtualList items={filtered} getKey={getTxKey}>
      {#snippet row(tx)}
        <TransactionCard transaction={tx} {categories} />
      {/snippet}
    </VirtualList>
  {/if}

  <!-- Load More Pagination Button with Loading Indicator -->
  {#if mobileState.transactionFilter === 'all' && hasMoreTransactions}
    <div class="pt-1">
      <button
        type="button"
        class="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-xs transition-colors hover:border-blue-300 hover:text-blue-600 disabled:opacity-60 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-blue-600 dark:hover:text-blue-400"
        disabled={mobileState.isLoadingMoreTransactions}
        onclick={loadMoreMobileTransactions}
      >
        {#if mobileState.isLoadingMoreTransactions}
          <svg class="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
          </svg>
          <span>Loading more transactions…</span>
        {:else}
          <span>Load more transactions ({totalLoadedCount} of {totalTransactionCount} loaded)</span>
        {/if}
      </button>
    </div>
  {/if}
</div>
