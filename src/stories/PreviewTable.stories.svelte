<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewTable from '../client/components/PreviewTable.svelte';
  import type { ImportPreviewReport } from '@/common/types';
    import { buildFireTableRow } from '@/fixtures/fire-row';
  
  const report: ImportPreviewReport = {
      rows: [
          buildFireTableRow({ ref: 'ref-001', description: 'Transaction 1' }),
          buildFireTableRow({ ref: 'ref-002', description: 'Transaction 2' }),
          buildFireTableRow({ ref: 'ref-003', description: 'Transaction 3' }),
          buildFireTableRow({ ref: 'ref-004', description: 'Transaction 4' }),
          buildFireTableRow({ ref: 'ref-005', description: 'Transaction 5' }),
          buildFireTableRow({ ref: 'ref-006', description: 'Transaction 6' }),
          buildFireTableRow({ ref: 'ref-007', description: 'Transaction 7' }),
          buildFireTableRow({ ref: 'ref-008', description: 'Transaction 8' }),
          buildFireTableRow({ ref: 'ref-009', description: 'Transaction 9' })
      ],
      hashes: ['hash1', 'hash2', 'hash3', 'hash4', 'hash5', 'hash6', 'hash7', 'hash8', 'hash9'],
      transactionMeta: {
          hash1: { status: 'valid', action: 'import' },
          hash2: { status: 'removed', action: 'skip' },
          hash3: { status: 'valid', action: 'import' },
          hash4: { status: 'valid', action: 'import' },
          hash5: { status: 'duplicate', action: 'import' },
          hash6: { status: 'duplicate', action: 'skip' },
          hash7: { status: 'valid', action: 'import' },
          hash8: { status: 'valid', action: 'import' },
          hash9: { status: 'duplicate', action: 'skip' }
      },
      summary: {
          totalRows: 0,
          validCount: 0,
          removedCount: 0,
          duplicateCount: 0,
          rulesApplied: 0
      }
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
