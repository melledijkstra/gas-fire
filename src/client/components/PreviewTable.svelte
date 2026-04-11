<script lang="ts">
  import type { ImportPreviewReport, TransactionAction, TransactionStatus } from '@/common/types';
  import { FIRE_COLUMNS } from '@/common/constants';
  import { importState } from '../states/import.svelte';
  import { Table as FlowTable, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Select, Tooltip } from 'flowbite-svelte';

  const {
    report,
    tableClass,
  }: {
    report: ImportPreviewReport;
    tableClass?: string;
  } = $props();

  const headers = Array.from(FIRE_COLUMNS);
  const showActionColumn = $derived(report.summary.duplicateCount > 0 || report.summary.removedCount > 0);

  const getRowClass = (status: TransactionStatus): string => {
    if (status === 'removed') return 'bg-red-100! dark:bg-red-900! line-through';
    if (status === 'duplicate') return 'bg-yellow-100! dark:bg-yellow-900! opacity-75';
    return '';
  };
</script>

<FlowTable class={[tableClass, 'border border-gray-400 mb-2.5 mr-2.5']} striped hoverable>
  <TableHead>
    {#if showActionColumn}
      <TableHeadCell class="py-2 px-1 normal-case">Action</TableHeadCell>
    {/if}
    {#each headers as header, i (i)}
      <TableHeadCell class="py-2 px-1 normal-case">{header}</TableHeadCell>
    {/each}
  </TableHead>
  <TableBody>
    {#each report.rows as row, i (`${report.hashes[i]}-${i}`)}
      {@const hash = report.hashes[i]}
      {@const meta = report.transactionMeta[hash]}
      <TableBodyRow class={getRowClass(meta.status)}>
        {#if showActionColumn}
          <TableBodyCell class="py-2 px-1 text-xs text-center">
            {#if meta.status === 'duplicate'}
              <Select
                size="sm"
                selectClass="p-1 w-[70px] wrap-break-word"
                value={importState.userDecisions.get(hash) ?? meta.action}
                placeholder="Select action"
                onchange={(e) => {
                  if (e?.currentTarget?.value) {
                    importState.userDecisions.set(hash, e.currentTarget.value as TransactionAction);
                  }
                }}
              >
                <option value="skip">Skip</option>
                <option value="import">Import</option>
              </Select>
            {:else if meta.status === 'removed'}
              <span id={`removed-span-${i}`} class="text-gray-500 font-medium border-b border-dotted border-gray-500 cursor-help">Removed</span>
              {#if meta.ruleName}
                <Tooltip triggeredBy={`#removed-span-${i}`} color="dark">Excluded by rule: {meta.ruleName}</Tooltip>
              {/if}
            {:else}
              <span class="text-green-600">Import</span>
            {/if}
          </TableBodyCell>
        {/if}
        {#each row as cell}
          <TableBodyCell class="py-2 px-1 text-xs">{cell}</TableBodyCell>
        {/each}
      </TableBodyRow>
    {/each}
  </TableBody>
</FlowTable>
