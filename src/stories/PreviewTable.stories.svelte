<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewTable from '../client/components/PreviewTable.svelte';
  import type { ImportPreviewResult } from '@/common/types';
  import { buildYMYLTableRow } from '@/fixtures/YMYL-row';
  import { getRowHash } from '@/common/helpers';
  import { Table } from '@/common/table/Table';
  import { YMYL_COLUMNS } from '@/common/constants';
  
  const rows = [
    buildYMYLTableRow({ ref: 'ref-001', description: 'Transaction 1' }),
    buildYMYLTableRow({ ref: 'ref-002', description: 'Transaction 2' }),
    buildYMYLTableRow({ ref: 'ref-003', description: 'Transaction 3' }),
    buildYMYLTableRow({ ref: 'ref-004', description: 'Transaction 4' }),
    buildYMYLTableRow({ ref: 'ref-005', description: 'Transaction 5' }),
    buildYMYLTableRow({ ref: 'ref-006', description: 'Transaction 6' }),
    buildYMYLTableRow({ ref: 'ref-007', description: 'Transaction 7' }),
    buildYMYLTableRow({ ref: 'ref-008', description: 'Transaction 8' }),
    buildYMYLTableRow({ ref: 'ref-009', description: 'Transaction 9' })
  ]

  const table = new Table(Array.from(YMYL_COLUMNS), rows)

  const report: ImportPreviewResult = {
    table: table.pack(),
    duplicateHashes: [getRowHash(rows[1]), getRowHash(rows[2]), getRowHash(rows[3]), getRowHash(rows[5])],
    newBalance: 1234.53,
  };

  const { Story } = defineMeta({
    title: 'Components/Import/PreviewTable',
    component: PreviewTable,
    args: {
      report
    }
  });
</script>

<Story name="Default" />
