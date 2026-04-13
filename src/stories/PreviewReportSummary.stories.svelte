<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewReportSummary from '../client/components/PreviewReportSummary.svelte';
  import type { ImportPreviewResult } from '@/common/types';

  const report: ImportPreviewResult = {
    newBalance: 12345.67,
    rows: [],
    duplicateHashes: new Set(['hash1', 'hash2']),
    removedHashes: new Set(['hash3']),
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
