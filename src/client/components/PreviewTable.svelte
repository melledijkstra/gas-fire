<script lang="ts">
  import type { ImportPreviewResult, TransactionAction } from '@/common/types';
  import { importState } from '../states/import.svelte'
  import { Table as FlowTable, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Select, Tooltip } from 'flowbite-svelte'
  import { FIRE_COLUMNS } from '@/common/constants'
  import { getRowHash } from '@/common/helpers'
  import { Table } from '@/common/table/Table'

  const {
    report,
    tableClass,
  }: {
    report: ImportPreviewResult
    tableClass?: string
  } = $props()

  const rows = $derived(Table.unpack(report.table).data)

  type RowStatus = 'import' | 'removed' | 'duplicate'
  
  const headers = Array.from(FIRE_COLUMNS)

  const getRowClass = (status: RowStatus): string => {
    if (status === 'removed') return 'bg-red-100! dark:bg-red-900! line-through'
    if (status === 'duplicate') return 'bg-yellow-100! dark:bg-yellow-900! opacity-75'
    return '';
  }

  const getRowStatus = (hash: string): RowStatus => {
    if (report?.ruleEngine?.removedHashes?.includes(hash)) return 'removed'
    if (report.duplicateHashes?.includes(hash)) return 'duplicate'
    return 'import'
  };
</script>

<FlowTable class={[tableClass, 'border border-gray-400 mb-2.5 mr-2.5']} striped hoverable>
  <TableHead>
    <TableHeadCell class="py-2 px-1 normal-case border-r border-gray-400">Action</TableHeadCell>
    {#each headers as header, i (i)}
      <TableHeadCell class="py-2 px-1 normal-case">{header}</TableHeadCell>
    {/each}
  </TableHead>
  <TableBody>
    {#each rows as row, i}
      {@const hash = getRowHash(row) /* PENDING: compute hash elsewhere for performance */}
      {@const status = getRowStatus(hash)}
      {@const excludedByRuleName = report?.ruleEngine?.rowExcludedRule[hash]}
      <TableBodyRow id={hash} class={getRowClass(status)}>
        <TableBodyCell class="py-2 px-1 text-xs text-center border-r border-gray-400">
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
            <span id={`removed-span-${i}`} class="text-gray-500 font-medium border-b border-dotted border-gray-500 cursor-help">Removed</span>
            {#if excludedByRuleName}
              <Tooltip triggeredBy={`#removed-span-${i}`} color="green">Excluded by rule: {excludedByRuleName}</Tooltip>
            {/if}
          {:else}
            <span class="text-green-600">Import</span>
          {/if}
        </TableBodyCell>
        {#each row as cell}
          <TableBodyCell class="py-2 px-1 text-xs">
            {cell instanceof Date ? cell.toISOString() : cell}
          </TableBodyCell>
        {/each}
      </TableBodyRow>
    {/each}
  </TableBody>
</FlowTable>
