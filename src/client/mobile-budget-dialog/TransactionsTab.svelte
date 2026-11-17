<script lang="ts">
  import { getFilteredTransactions, mobileState } from '../states/mobile.svelte'
  import TransactionCard from './TransactionCard.svelte'

  const filtered = $derived(getFilteredTransactions())
  const categories = $derived(mobileState.dashboard?.categories ?? [])
  const uncategorizedCount = $derived(mobileState.dashboard?.uncategorizedCount ?? 0)
  const totalLoadedCount = $derived(mobileState.dashboard?.transactions.length ?? 0)
</script>

<div class="space-y-3 pb-4">
  <!-- Filter & Search Controls -->
  <div class="space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-xs">
    <div class="grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 text-xs font-medium">
      <button
        type="button"
        class="rounded-md py-1.5 transition-colors {mobileState.transactionFilter === 'uncategorized' ? 'bg-white font-semibold text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}"
        onclick={() => (mobileState.transactionFilter = 'uncategorized')}
      >
        ⛔ Uncategorized ({uncategorizedCount})
      </button>
      <button
        type="button"
        class="rounded-md py-1.5 transition-colors {mobileState.transactionFilter === 'all' ? 'bg-white font-semibold text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'}"
        onclick={() => (mobileState.transactionFilter = 'all')}
      >
        📋 All Recent ({totalLoadedCount})
      </button>
    </div>

    <div class="relative">
      <input
        type="search"
        placeholder="Search merchant, description, comment, category..."
        class="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-900 focus:border-blue-500 focus:bg-white focus:ring-blue-500"
        bind:value={mobileState.searchQuery}
      />
    </div>
  </div>

  <!-- Transactions List -->
  {#if filtered.length === 0}
    <div class="rounded-xl border border-gray-200 bg-white p-8 text-center">
      {#if mobileState.transactionFilter === 'uncategorized' && !mobileState.searchQuery}
        <p class="text-2xl">🎉</p>
        <p class="mt-2 text-sm font-semibold text-gray-900">Inbox Zero!</p>
        <p class="mt-1 text-xs text-gray-500">
          Every transaction in your sheet has a category assigned.
        </p>
        <button
          type="button"
          class="mt-3 rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          onclick={() => (mobileState.transactionFilter = 'all')}
        >
          View Recent Transactions
        </button>
      {:else}
        <p class="text-sm font-medium text-gray-700">No matching transactions found.</p>
        <p class="mt-1 text-xs text-gray-500">Try clearing your search or switching filters.</p>
      {/if}
    </div>
  {:else}
    <div class="space-y-2">
      {#each filtered as tx (tx.ref)}
        <TransactionCard transaction={tx} {categories} />
      {/each}
    </div>
  {/if}
</div>
