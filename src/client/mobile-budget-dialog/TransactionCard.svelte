<script lang="ts">
  import type { MobileCategoryInfo, MobileTransaction } from '@/common/types'
  import { mobileState, saveMobileTransactionEdit } from '../states/mobile.svelte'
  import { formatCurrency } from '../utils/mobile-budget'

  interface Props {
    transaction: MobileTransaction
    categories: MobileCategoryInfo[]
  }

  let { transaction, categories }: Props = $props()

  let isExpanded = $state(false)
  let draftComments = $state('')

  const isSaving = $derived(mobileState.savingRefs.has(transaction.ref))
  const isUncategorized = $derived(transaction.category === '')

  function toggleExpand() {
    if (!isExpanded) {
      draftComments = transaction.comments
    }
    isExpanded = !isExpanded
  }

  async function handleCategoryChange(event: Event) {
    const select = event.currentTarget as HTMLSelectElement
    const newCategory = select.value
    await saveMobileTransactionEdit(transaction.ref, newCategory, draftComments || transaction.comments)
  }

  async function handleSaveComments() {
    await saveMobileTransactionEdit(transaction.ref, transaction.category, draftComments)
    isExpanded = false
  }
</script>

<div class="rounded-xl border bg-white shadow-xs transition-all {isUncategorized ? 'border-amber-300' : 'border-gray-200'}">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-3 p-3 text-left"
    onclick={toggleExpand}
  >
    <div class="flex min-w-0 items-center gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg {isUncategorized ? 'bg-amber-100' : 'bg-gray-100'}"
      >
        {transaction.icon}
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-gray-900">
          {transaction.contraAccount || transaction.description || 'Transaction'}
        </p>
        <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
          <span>{transaction.date}</span>
          <span>•</span>
          <span class="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
            {transaction.accountLabel}
          </span>
          {#if isUncategorized}
            <span class="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">
              Uncategorized
            </span>
          {:else}
            <span class="truncate text-gray-600">{transaction.category}</span>
          {/if}
        </div>
        {#if transaction.comments}
          <p class="mt-1 truncate text-xs italic text-gray-500">
            “{transaction.comments}”
          </p>
        {/if}
      </div>
    </div>

    <div class="shrink-0 text-right">
      <p class="text-sm font-bold {transaction.amount >= 0 ? 'text-emerald-600' : 'text-gray-900'}">
        {formatCurrency(transaction.amount, transaction.currency)}
      </p>
      {#if isSaving}
        <span class="text-[11px] font-medium text-blue-600">Saving...</span>
      {:else}
        <span class="text-[11px] text-gray-400">{isExpanded ? 'Close ▲' : 'Edit ▼'}</span>
      {/if}
    </div>
  </button>

  {#if isExpanded}
    <div class="space-y-3 border-t border-gray-100 bg-gray-50/70 px-3 py-3 text-xs">
      {#if transaction.description && transaction.description !== transaction.contraAccount}
        <p class="text-gray-600">
          <span class="font-medium text-gray-700">Details:</span> {transaction.description}
        </p>
      {/if}

      <div>
        <label class="mb-1 block font-medium text-gray-700" for="cat-{transaction.ref}">
          Category
        </label>
        <select
          id="cat-{transaction.ref}"
          class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
          value={transaction.category}
          disabled={isSaving}
          onchange={handleCategoryChange}
        >
          <option value="">⛔ -- Uncategorized --</option>
          {#each categories as cat (cat.name)}
            <option value={cat.name}>{cat.icon} {cat.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="mb-1 block font-medium text-gray-700" for="comment-{transaction.ref}">
          Comments
        </label>
        <div class="flex gap-2">
          <input
            id="comment-{transaction.ref}"
            type="text"
            placeholder="Add a note or comment..."
            class="flex-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
            bind:value={draftComments}
            disabled={isSaving}
            onkeydown={e => e.key === 'Enter' && handleSaveComments()}
          />
          <button
            type="button"
            class="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={isSaving}
            onclick={handleSaveComments}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
