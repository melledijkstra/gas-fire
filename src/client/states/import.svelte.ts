import type { BankOptions, RawTable, ImportPreviewReport, TransactionAction } from '@/common/types';
import { SvelteSet, SvelteMap } from 'svelte/reactivity';

type ImportState = {
  bankOptions: BankOptions;
  isProcessing: boolean;
  inputFiles?: FileList;
  rawImportData?: RawTable;
  selectedBank?: string;
  selectedRows: SvelteSet<number>;
  previewReport?: ImportPreviewReport;
  userDecisions: SvelteMap<string, TransactionAction>;
};

export const importState: ImportState = $state({
  bankOptions: {},
  isProcessing: false,
  selectedRows: new SvelteSet(),
  userDecisions: new SvelteMap()
});

export const addSelectedRow = (index: number) => {
  importState.selectedRows.add(index);
};

export const removeSelectedRow = (index: number) => {
  importState.selectedRows.delete(index);
};
