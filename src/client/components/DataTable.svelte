<script lang="ts">
  import type { RawTable, ImportPreviewReport, TransactionAction } from '@/common/types';
  import { addSelectedRow, importState, removeSelectedRow } from '../states/import.svelte';
  import { Checkbox, Table as FlowTable, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Select } from 'flowbite-svelte';

  const {
    table,
    report,
    selectable = false,
    tableClass,
  }: {
    table?: RawTable;
    report?: ImportPreviewReport;
    selectable?: boolean;
    tableClass?: string;
  } = $props();

  const selectedRows = $derived(importState.selectedRows);
  
  const headers = $derived(report ? report.headers : (table?.[0] ?? []));
  const rows = $derived(table?.slice(1) ?? []);

  const allRowsSelected = $derived(rows.length > 0 && rows.every((_, i) => selectedRows.has(i + 1)));
  const isPreview = $derived(!!report);
  const hasDetectedDuplicates = $derived(report ? report.summary.duplicateCount > 0 : false);

  const getRowClass = (status: string) => {
    if (status === 'removed') return 'opacity-50 line-through';
    if (status === 'duplicate') return 'bg-yellow-100! dark:bg-yellow-900! opacity-75';
    return '';
  };

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
    {#if hasDetectedDuplicates}
      <!-- action column header for preview mode -->
      <TableHeadCell class="py-2 px-1 normal-case">Action</TableHeadCell>
    {/if}
    {#each headers as header, headerIndex (headerIndex)}
      <TableHeadCell class="py-2 px-1 normal-case">{header}</TableHeadCell>
    {/each}
  </TableHead>
  <TableBody>
    {#if isPreview && report}
      {#each report.transactions as transaction (transaction.hash)}
        <TableBodyRow class={getRowClass(transaction.status)}>
          {#if hasDetectedDuplicates}
            <TableBodyCell class="py-2 px-1 text-xs text-center">
              {#if transaction.status === 'duplicate'}
                <Select
                  size="sm"
                  class="p-1 text-xs"
                  value={importState.userDecisions.get(transaction.hash) || 'skip'}
                  onchange={(e) => {
                    importState.userDecisions.set(transaction.hash, e.target.value as TransactionAction);
                  }}
                >
                  <option value="skip">Skip</option>
                  <option value="import">Force Import</option>
                </Select>
              {:else if transaction.status === 'removed'}
                <span class="text-gray-500">Removed</span>
              {:else}
                <span class="text-green-600">Import</span>
              {/if}
            </TableBodyCell>
          {/if}
          {#each transaction.row as cell}
            <TableBodyCell class="py-2 px-1 text-xs">
              {cell}
            </TableBodyCell>
          {/each}
        </TableBodyRow>
      {/each}
    {:else}
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
            <TableBodyCell class="py-2 px-1 text-xs">
              {cell}
            </TableBodyCell>
          {/each}
        </TableBodyRow>
      {/each}
    {/if}
  </TableBody>
</FlowTable>
