import type { AccountOptions, RawTable, ImportPreviewResult, TransactionAction } from '@/common/types'
import { SvelteSet, SvelteMap } from 'svelte/reactivity'

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
