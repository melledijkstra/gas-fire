<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewTable from '../client/components/PreviewTable.svelte';
  import type { ImportPreviewResult } from '@/common/types';
  import { buildFireTableRow } from '@/fixtures/fire-row';
    import { getRowHash } from '@/server/deduplication/duplicate-finder';
  
  const rows = [
    buildFireTableRow({ ref: 'ref-001', description: 'Transaction 1' }),
    buildFireTableRow({ ref: 'ref-002', description: 'Transaction 2' }),
    buildFireTableRow({ ref: 'ref-003', description: 'Transaction 3' }),
    buildFireTableRow({ ref: 'ref-004', description: 'Transaction 4' }),
    buildFireTableRow({ ref: 'ref-005', description: 'Transaction 5' }),
    buildFireTableRow({ ref: 'ref-006', description: 'Transaction 6' }),
    buildFireTableRow({ ref: 'ref-007', description: 'Transaction 7' }),
    buildFireTableRow({ ref: 'ref-008', description: 'Transaction 8' }),
    buildFireTableRow({ ref: 'ref-009', description: 'Transaction 9' })
  ]

  const report: ImportPreviewResult = {
    rows: rows,
    duplicateHashes: new Set([getRowHash(rows[1]), getRowHash(rows[2]), getRowHash(rows[3]), getRowHash(rows[5])]),
    removedHashes: new Set([getRowHash(rows[4]), getRowHash(rows[6]), getRowHash(rows[7]), getRowHash(rows[8])]),
    newBalance: 1234.53
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
