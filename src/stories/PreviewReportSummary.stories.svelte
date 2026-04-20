<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewReportSummary from '../client/components/PreviewReportSummary.svelte';
  import type { ImportPreviewResult } from '@/common/types';
  import { Table } from '@/common/table/Table';

  const table = new Table();

  const report: ImportPreviewResult = {
    newBalance: 12345.67,
    table: table.pack(),
    duplicateHashes: ['hash1', 'hash2'],
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
