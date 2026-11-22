<script lang="ts">
  import { roundCurrency } from '@/common/budget'
  import type { MobileSubcategoryBudget } from '@/common/types'
  import { mobileState, saveSubcategoryBudgetEdit } from '../states/mobile.svelte'
  import { formatCurrency, MONTH_NAMES } from '../utils/mobile-budget'

  interface Props {
    year: number
    category: string
    subcategories: MobileSubcategoryBudget[]
  }

  let { year, category, subcategories }: Props = $props()

  let selectedSubcategoryName = $state<string | null>(null)
  let draftInputs = $state<string[]>([])
  let validationError = $state<string | null>(null)

  const selectedSubcategory = $derived(
    subcategories.find(s => s.name === selectedSubcategoryName) ?? null,
  )

  function openSubcategory(sub: MobileSubcategoryBudget) {
    selectedSubcategoryName = sub.name
    draftInputs = sub.months.map(val => String(val))
    validationError = null
  }

  function backToList() {
    selectedSubcategoryName = null
    draftInputs = []
    validationError = null
  }

  function parseDraftValue(raw: string): number | null {
    const normalized = raw.trim().replace(',', '.')
    if (normalized === '' || normalized === '-') {
      return 0
    }
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? roundCurrency(parsed) : null
  }

  function toggleSign(monthIdx: number) {
    const parsed = parseDraftValue(draftInputs[monthIdx] ?? '0')
    if (parsed === null) {
      return
    }
    const flipped = parsed === 0 ? 0 : roundCurrency(-parsed)
    draftInputs[monthIdx] = String(flipped)
  }

  const changedMonths = $derived.by(() => {
    if (!selectedSubcategory) {
      return {} as Record<number, number>
    }
    const updates: Record<number, number> = {}
    for (let i = 0; i < 12; i++) {
      const parsed = parseDraftValue(draftInputs[i] ?? '0')
      if (parsed === null) {
        continue
      }
      const original = roundCurrency(selectedSubcategory.months[i] ?? 0)
      if (parsed !== original) {
        updates[i + 1] = parsed
      }
    }
    return updates
  })

  const changedCount = $derived(Object.keys(changedMonths).length)

  const hasInvalidInput = $derived(
    selectedSubcategory !== null
    && draftInputs.some(raw => parseDraftValue(raw) === null),
  )

  function resetDrafts() {
    if (!selectedSubcategory) return
    draftInputs = selectedSubcategory.months.map(val => String(val))
    validationError = null
  }

  async function handleSave() {
    if (!selectedSubcategory) return
    if (hasInvalidInput) {
      validationError = 'Please enter valid numbers for all months.'
      return
    }
    if (changedCount === 0) return

    validationError = null
    const saved = await saveSubcategoryBudgetEdit({
      year,
      category,
      subcategoryName: selectedSubcategory.name,
      rowIndex: selectedSubcategory.rowIndex,
      monthUpdates: changedMonths,
    })

    if (saved) {
      const refreshed = subcategories.find(s => s.name === selectedSubcategory.name)
      if (refreshed) {
        draftInputs = refreshed.months.map(val => String(val))
      }
    }
  }

  function getSignColorClass(raw: string): string {
    const parsed = parseDraftValue(raw)
    if (parsed === null) {
      return 'border-rose-500 text-rose-600 dark:border-rose-500 dark:text-rose-400'
    }
    if (parsed < 0) {
      return 'border-rose-300 text-rose-600 dark:border-rose-700 dark:text-rose-400'
    }
    if (parsed > 0) {
      return 'border-emerald-300 text-emerald-600 dark:border-emerald-700 dark:text-emerald-400'
    }
    return 'border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300'
  }
</script>

{#if subcategories.length === 0}
  <div class="rounded-xl border border-gray-200 bg-white p-5 text-center text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
    No editable subcategories found for <strong>{category}</strong> in the {year} sheet.
  </div>
{:else if !selectedSubcategory}
  <!-- Step 1: Subcategory Picker for Shared Year -->
  <div class="space-y-2">
    <p class="text-xs text-gray-500 dark:text-gray-400">
      Select a subcategory in <strong>{year}</strong> to edit its 12 monthly targets:
    </p>

    {#each subcategories as sub (sub.rowIndex)}
      {@const monthVal = sub.months[mobileState.selectedMonth - 1] ?? 0}
      {@const annualTotal = roundCurrency(sub.months.reduce((sum, v) => sum + v, 0))}
      <button
        type="button"
        class="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-xs transition-colors hover:border-blue-400 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-blue-500"
        onclick={() => openSubcategory(sub)}
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{sub.name}</p>
          <p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {year} total:
            <span class="font-medium {annualTotal < 0 ? 'text-rose-600 dark:text-rose-400' : annualTotal > 0 ? 'text-emerald-600 dark:text-emerald-400' : ''}">
              {formatCurrency(annualTotal)}
            </span>
          </p>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <div class="text-right">
            <p class="text-xs font-bold {monthVal < 0 ? 'text-rose-600 dark:text-rose-400' : monthVal > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'}">
              {formatCurrency(monthVal)}
            </p>
            <p class="text-[10px] text-gray-400 dark:text-gray-500">
              {MONTH_NAMES[mobileState.selectedMonth - 1]?.slice(0, 3)}
            </p>
          </div>
          <span class="text-sm text-gray-400">›</span>
        </div>
      </button>
    {/each}
  </div>
{:else}
  <!-- Step 2: 12-Month Subcategory Target Editor -->
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg bg-gray-200/80 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        onclick={backToList}
      >
        ‹ Subcategories
      </button>
      <span class="truncate text-sm font-bold text-gray-900 dark:text-gray-100">
        {selectedSubcategory.name} ({year})
      </span>
    </div>

    <p class="text-[11px] text-gray-500 dark:text-gray-400">
      Choose the sign for each month: <span class="font-semibold text-rose-600 dark:text-rose-400">negative (red)</span> for expenses, <span class="font-semibold text-emerald-600 dark:text-emerald-400">positive (green)</span> for income. Only changed months are saved.
    </p>

    {#if validationError}
      <div class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
        {validationError}
      </div>
    {/if}

    <div class="space-y-1.5 rounded-xl border border-gray-200 bg-white p-2.5 dark:border-gray-800 dark:bg-gray-900">
      {#each MONTH_NAMES as monthName, idx (monthName)}
        {@const monthNum = idx + 1}
        {@const rawVal = draftInputs[idx] ?? '0'}
        {@const isEdited = changedMonths[monthNum] !== undefined}
        {@const isCurrentSelected = monthNum === mobileState.selectedMonth}

        <div class="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 {isCurrentSelected ? 'bg-blue-50/70 dark:bg-blue-950/40' : ''}">
          <label class="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300" for="sub-month-{monthNum}">
            <span class="w-20">{monthName}</span>
            {#if isEdited}
              <span class="h-1.5 w-1.5 rounded-full bg-blue-500" title="Modified"></span>
            {/if}
          </label>

          <div class="flex items-center gap-1.5">
            <button
              type="button"
              class="rounded-md border border-gray-300 bg-gray-100 px-2 py-1 text-xs font-bold text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              disabled={mobileState.isSavingSubcategory}
              onclick={() => toggleSign(idx)}
              title="Toggle +/- sign"
            >
              ±
            </button>
            <input
              id="sub-month-{monthNum}"
              type="text"
              inputmode="decimal"
              class="w-28 rounded-lg border bg-white px-2.5 py-1.5 text-right text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:outline-none dark:bg-gray-950 {getSignColorClass(rawVal)}"
              bind:value={draftInputs[idx]}
              disabled={mobileState.isSavingSubcategory}
            />
          </div>
        </div>
      {/each}
    </div>

    <!-- Action Bar -->
    <div class="flex items-center justify-between gap-2 pt-1">
      <span class="text-xs text-gray-500 dark:text-gray-400">
        {changedCount === 0 ? 'No changes' : `${changedCount} ${changedCount === 1 ? 'month' : 'months'} modified`}
      </span>
      <div class="flex items-center gap-2">
        {#if changedCount > 0}
          <button
            type="button"
            class="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            disabled={mobileState.isSavingSubcategory}
            onclick={resetDrafts}
          >
            Reset
          </button>
        {/if}

        <button
          type="button"
          class="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={mobileState.isSavingSubcategory || changedCount === 0 || hasInvalidInput}
          onclick={handleSave}
        >
          {#if mobileState.isSavingSubcategory}
            <svg class="h-3.5 w-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            <span>Saving…</span>
          {:else}
            <span>Save Changes</span>
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}
