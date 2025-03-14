import { StrategyOption, type Table } from '@/common/types';
import { SvelteSet } from 'svelte/reactivity';

type ImportState = {
  statusText?: string;
  importData?: Table;
  strategy?: StrategyOption;
  selectedRows: SvelteSet<number>;
};

export const importState: ImportState = $state({
  selectedRows: new SvelteSet()
});

export const setImportData = (table?: Table) => {
  importState.importData = table
};

export const addSelectedRow = (index: number) => {
  importState.selectedRows.add(index);
};

export const removeSelectedRow = (index: number) => {
  importState.selectedRows.delete(index);
};
