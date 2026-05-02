import type { AccountOptions, ImportPreviewResult, RawTable, TransactionAction } from '@/common/types'
import { SvelteMap, SvelteSet } from 'svelte/reactivity'

type ImportState = {
  accountOptions: AccountOptions
  isProcessing: boolean
  inputFiles?: FileList
  rawImportData?: RawTable
  selectedAccount?: string
  selectedRows: SvelteSet<number>
  previewReport?: ImportPreviewResult
  userDecisions: SvelteMap<string, TransactionAction>
}

export const importState: ImportState = $state({
  accountOptions: {},
  isProcessing: false,
  selectedRows: new SvelteSet(),
  userDecisions: new SvelteMap(),
})

export const addSelectedRow = (index: number) => {
  importState.selectedRows.add(index)
}

export const removeSelectedRow = (index: number) => {
  importState.selectedRows.delete(index)
}
