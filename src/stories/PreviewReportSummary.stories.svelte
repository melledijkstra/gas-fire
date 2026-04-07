<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewReportSummary from '../client/components/PreviewReportSummary.svelte';
  import type { ImportPreviewReport } from '@/common/types';

  const report: ImportPreviewReport = {
    summary: {
      totalRows: 100,
      validCount: 80,
      duplicateCount: 15,
      rulesApplied: 3,
      removedCount: 5,
    },
    newBalance: 12345.67,
    hashes: [],
    rows: [],
    transactionMeta: {}
  }
  
  const { Story } = defineMeta({
    title: 'Components/Import/PreviewReportSummary',
    component: PreviewReportSummary,
    args: {
      report,
    },
  });
</script>

<Story name="Default" />
