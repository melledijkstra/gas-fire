<script lang="ts">
  import type { Table } from '@/common/types';
  import { addSelectedRow, importState, removeSelectedRow } from '../states/import.svelte';
  import { Checkbox, Table as FlowTable, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from 'flowbite-svelte';

  const {
    table,
    selectable = false,
    tableClass,
  }: {
    table: Table;
    selectable?: boolean;
    tableClass?: string;
  } = $props();

  const selectedRows = $derived(importState.selectedRows);
  
  const headers = $derived(table?.[0] ?? []);
  const rows = $derived(table?.slice(1) ?? []);

  const allRowsSelected = $derived(rows.length > 0 && rows.every((_, i) => selectedRows.has(i + 1)));

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

<FlowTable class={[
  tableClass,
  'border border-gray-400 mb-2.5 mr-2.5'
]} striped hoverable>
  <TableHead>
    {#if selectable}
      <!-- Checkbox column header -->
      <TableHeadCell>
        <Checkbox
          type="checkbox"
          aria-label={`Select all rows`}
          checked={allRowsSelected}
          onchange={() => {
            if (allRowsSelected) {
              // Deselect all
              rows.forEach((_, index) => removeSelectedRow(index + 1));
            } else {
              // Select all
              rows.forEach((_, index) => addSelectedRow(index + 1));
            }
          }}
        />
      </TableHeadCell>
    {/if}
    {#each headers as header, headerIndex (headerIndex)}
      <TableHeadCell class="py-2 px-1 normal-case">{header}</TableHeadCell>
    {/each}
  </TableHead>
  <TableBody>
    {#each rows as row, rowIndex (rowIndex)}
      <TableBodyRow>
        {#if selectable}
          <TableBodyCell class="py-2 px-1 text-xs text-center">
            <Checkbox
              type="checkbox"
              aria-label={`Select row ${rowIndex + 1}`}
              checked={isRowSelected(rowIndex + 1)}
              onchange={() => handleRowSelect(rowIndex + 1)}
            />
          </TableBodyCell>
        {/if}
        {#each row as cell}
          <TableBodyCell class="py-2 px-1 text-xs">{cell}</TableBodyCell>
        {/each}
      </TableBodyRow>
    {/each}
    </TableBody>
</FlowTable>
