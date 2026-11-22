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
  let draftCategory = $state('')
  let draftComments = $state('')

  const isSaving = $derived(mobileState.savingRefs.has(transaction.ref))
  const isUncategorized = $derived(transaction.category === '')
  const hasChanges = $derived(
    draftCategory.trim() !== transaction.category
    || draftComments.trim() !== transaction.comments,
  )

  function toggleExpand() {
    if (!isExpanded) {
      draftCategory = transaction.category
      draftComments = transaction.comments
    }
    isExpanded = !isExpanded
  }

  function handleCancel() {
    draftCategory = transaction.category
    draftComments = transaction.comments
    isExpanded = false
  }

  async function handleSave() {
    if (!hasChanges || isSaving) return
    const ok = await saveMobileTransactionEdit(transaction.ref, draftCategory, draftComments)
    if (ok) {
      isExpanded = false
    }
  }
</script>

<div class="rounded-xl border bg-white shadow-xs transition-all dark:bg-gray-900 {isUncategorized ? 'border-amber-300 dark:border-amber-700/70' : 'border-gray-200 dark:border-gray-800'}">
  <button
    type="button"
    class="flex w-full items-center justify-between gap-3 p-3 text-left"
    onclick={toggleExpand}
  >
    <div class="flex min-w-0 items-center gap-3">
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg {isUncategorized ? 'bg-amber-100 dark:bg-amber-950/80' : 'bg-gray-100 dark:bg-gray-800'}"
      >
        {transaction.icon}
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">
          {transaction.contraAccount || transaction.description || 'Transaction'}
        </p>
        <div class="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span>{transaction.date}</span>
          <span>•</span>
          <span class="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            {transaction.accountLabel}
          </span>
          {#if isUncategorized}
            <span class="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
              Uncategorized
            </span>
          {:else}
            <span class="truncate text-gray-600 dark:text-gray-300">{transaction.category}</span>
          {/if}
        </div>
        {#if transaction.comments}
          <p class="mt-1 truncate text-xs italic text-gray-500 dark:text-gray-400">
            “{transaction.comments}”
          </p>
        {/if}
      </div>
    </div>

    <div class="shrink-0 text-right">
      <p class="text-sm font-bold {transaction.amount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-gray-100'}">
        {formatCurrency(transaction.amount, transaction.currency)}
      </p>
      {#if isSaving}
        <span class="text-[11px] font-medium text-blue-600 dark:text-blue-400">Saving…</span>
      {:else}
        <span class="text-[11px] text-gray-400 dark:text-gray-500">{isExpanded ? 'Close ▲' : 'Edit ▼'}</span>
      {/if}
    </div>
  </button>

  {#if isExpanded}
    <div class="space-y-3 rounded-b-xl border-t border-gray-100 bg-gray-50/70 px-3 py-3 text-xs dark:border-gray-800 dark:bg-gray-800/40">
      {#if transaction.description && transaction.description !== transaction.contraAccount}
        <p class="text-gray-600 dark:text-gray-300">
          <span class="font-medium text-gray-700 dark:text-gray-200">Details:</span> {transaction.description}
        </p>
      {/if}

      <div>
        <label class="mb-1 block font-medium text-gray-700 dark:text-gray-300" for="cat-{transaction.ref}">
          Category
        </label>
        <select
          id="cat-{transaction.ref}"
          class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          bind:value={draftCategory}
          disabled={isSaving}
        >
          <option value="">⛔ -- Uncategorized --</option>
          {#each categories as cat (cat.name)}
            <option value={cat.name}>{cat.icon} {cat.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label class="mb-1 block font-medium text-gray-700 dark:text-gray-300" for="comment-{transaction.ref}">
          Comments
        </label>
        <input
          id="comment-{transaction.ref}"
          type="text"
          placeholder="Add a note or comment..."
          class="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
          bind:value={draftComments}
          disabled={isSaving}
          onkeydown={e => e.key === 'Enter' && handleSave()}
        />
      </div>

      <div class="flex items-center justify-end gap-2 pt-0.5">
        <button
          type="button"
          class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          disabled={isSaving}
          onclick={handleCancel}
        >
          Cancel
        </button>

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={isSaving || !hasChanges}
          onclick={handleSave}
        >
          {#if isSaving}
            <svg class="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>Saving…</span>
          {:else}
            <span>Save</span>
          {/if}
        </button>
      </div>
    </div>
  {/if}
</div>
