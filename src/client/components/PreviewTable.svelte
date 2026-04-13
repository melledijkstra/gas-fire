<script lang="ts">
  import type { ImportPreviewResult, TransactionAction } from '@/common/types'
  import { importState } from '../states/import.svelte'
  import { Table as FlowTable, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Select } from 'flowbite-svelte'
  import { FIRE_COLUMNS } from '@/common/constants'
  import { getRowHash } from '@/common/helpers'

  const {
    report,
    tableClass,
  }: {
    report: ImportPreviewResult
    tableClass?: string
  } = $props()

  type RowStatus = 'import' | 'removed' | 'duplicate'

  const headers = Array.from(FIRE_COLUMNS)
  const hasDetectedDuplicates = $derived(report.duplicateHashes?.size > 0)

  const getRowClass = (status: RowStatus): string => {
    if (status === 'removed') return 'bg-red-100! dark:bg-red-900! line-through'
    if (status === 'duplicate') return 'bg-yellow-100! dark:bg-yellow-900! opacity-75'
    return '';
  };

  const getRowStatus = (hash: string): RowStatus => {
    if (report.removedHashes?.has(hash)) return 'removed'
    if (report.duplicateHashes?.has(hash)) return 'duplicate'
    return 'import'
  };
</script>

<FlowTable class={[tableClass, 'border border-gray-400 mb-2.5 mr-2.5']} striped hoverable>
  <TableHead>
    {#if hasDetectedDuplicates}
      <TableHeadCell class="py-2 px-1 normal-case">Action</TableHeadCell>
    {/if}
    {#each headers as header, i (i)}
      <TableHeadCell class="py-2 px-1 normal-case">{header}</TableHeadCell>
    {/each}
  </TableHead>
  <TableBody>
    {#each report.rows as row, i (`${getRowHash(row)}-${i}`)}
      {@const hash = getRowHash(row)}
      {@const status = getRowStatus(hash)}
      <TableBodyRow class={getRowClass(status)}>
        {#if hasDetectedDuplicates}
          <TableBodyCell class="py-2 px-1 text-xs text-center">
            {#if status === 'duplicate'}
              <Select
                size="sm"
                selectClass="p-1 w-[70px] wrap-break-word"
                value={importState.userDecisions.get(hash) ?? 'import'}
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
            {:else if status === 'removed'}
              <span class="text-gray-500">Removed</span>
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
