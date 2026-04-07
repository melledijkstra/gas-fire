<script lang="ts">
  import type { ImportPreviewReport } from '@/common/types';
  import { getBrowserLocale } from '../utils/web';
  import { Badge } from 'flowbite-svelte';

  const { report } = $props<{ report: ImportPreviewReport }>();

  const locale = getBrowserLocale();
</script>

<div class="mb-4">
  <p>Total Rows: <Badge color="gray" class="text-base">{report.summary.totalRows}</Badge></p>
  <Badge color="green">Valid Rows: {report.summary.validCount}</Badge>
  <Badge color="red">Removed Rows: {report.summary.removedCount}</Badge>
  <Badge color="yellow">Duplicate Rows: {report.summary.duplicateCount}</Badge>
  {#if report.newBalance !== undefined}
    <p>New Balance: {report.newBalance.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}</p>
  {/if}
</div>