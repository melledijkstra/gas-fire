import type { Table } from '@/common/types';
import { SvelteSet } from 'svelte/reactivity';

type ImportState = {
  importData?: Table;
  strategy?: string;
  selectedRows: SvelteSet<number>;
};

export const importState: ImportState = $state({
  selectedRows: new SvelteSet()
});

export const addSelectedRow = (index: number) => {
  importState.selectedRows.add(index);
};

export const removeSelectedRow = (index: number) => {
  importState.selectedRows.delete(index);
};
