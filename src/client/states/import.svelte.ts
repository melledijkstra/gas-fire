import type { BankOptions, Table } from '@/common/types';
import { SvelteSet } from 'svelte/reactivity';

type ImportState = {
  bankOptions: BankOptions;
  isProcessing: boolean;
  inputFiles?: FileList;
  rawImportData?: Table;
  selectedBank?: string;
  selectedRows: SvelteSet<number>;
  previewData?: Table;
  statusText?: string;
};

export const importState: ImportState = $state({
  bankOptions: {},
  isProcessing: false,
  selectedRows: new SvelteSet()
});

export const addSelectedRow = (index: number) => {
  importState.selectedRows.add(index);
};

export const removeSelectedRow = (index: number) => {
  importState.selectedRows.delete(index);
};
