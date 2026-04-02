import type { BankOptions, RawTable } from '@/common/types';
import { SvelteSet } from 'svelte/reactivity';

type ImportState = {
  bankOptions: BankOptions;
  isProcessing: boolean;
  inputFiles?: FileList;
  rawImportData?: RawTable;
  selectedBank?: string;
  selectedRows: SvelteSet<number>;
  duplicateRows: SvelteSet<number>;
  previewData?: RawTable;
};

export const importState: ImportState = $state({
  bankOptions: {},
  isProcessing: false,
  selectedRows: new SvelteSet(),
  duplicateRows: new SvelteSet()
});

export const addSelectedRow = (index: number) => {
  importState.selectedRows.add(index);
};

export const removeSelectedRow = (index: number) => {
  importState.selectedRows.delete(index);
};
