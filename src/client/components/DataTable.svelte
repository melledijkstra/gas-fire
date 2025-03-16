<script lang="ts">
  import type { Table } from '@/common/types';
  import { addSelectedRow, importState, removeSelectedRow } from '../states/import.svelte';
  import { Table as FlowTable, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

  export type TableOptions = {
    selectable: boolean;
  };

  const defaultOptions: TableOptions = {
    selectable: false,
  };

  const {
    table,
    options = defaultOptions,
  }: {
    table: Table;
    options?: TableOptions;
  } = $props();

  const { selectable } = options;
  const { selectedRows } = importState;

  const headers = table?.[0];
  const rows = table?.slice(1);

  // Toggle row selection
  const handleRowSelect = (index: number) => {
    if (selectedRows.has(index)) {
      removeSelectedRow(index);
    } else {
      addSelectedRow(index);
    }
  }

  // Determine if a row is selected
  const isRowSelected = (index: number) => selectedRows.has(index);
</script>

<FlowTable>
  <TableHead>
    {#if selectable}
      <!-- Checkbox column header -->
      <TableHeadCell></TableHeadCell>
    {/if}
    {#each headers as header}
      <TableHeadCell class="py-2 px-1">{header}</TableHeadCell>
    {/each}
  </TableHead>
  <TableBody tableBodyClass="divide-y">
    {#each rows as row, rowIndex}
      <TableBodyRow> <!-- selected={selectable && isRowSelected(rowIndex + 1)}> -->
        {#if selectable}
          <TableBodyCell tdClass="py-2 px-1 text-xs text-center">
            <input
              type="checkbox"
              checked={isRowSelected(rowIndex + 1)}
              onchange={() => handleRowSelect(rowIndex + 1)}
            />
          </TableBodyCell>
        {/if}
        {#each row as cell}
          <TableBodyCell tdClass="py-2 px-1 text-xs">{cell}</TableBodyCell>
        {/each}
      </TableBodyRow>
    {/each}
    </TableBody>
</FlowTable>
