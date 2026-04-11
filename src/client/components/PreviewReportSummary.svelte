<script lang="ts">
  import type { ImportPreviewReport } from '@/common/types';
  import { getBrowserLocale } from '../utils/web';
  import { Badge } from 'flowbite-svelte';

  const { report } = $props<{ report: ImportPreviewReport }>();

  const locale = getBrowserLocale();
</script>

<div class="mb-4">
  <p>Total Rows: <Badge color="gray" class="text-base" border>{report.summary.totalRows}</Badge></p>
  <Badge color="green" border>Valid Rows: {report.summary.validCount}</Badge>
  <Badge color="red" border>Removed Rows: {report.summary.removedCount}</Badge>
  <Badge color="yellow" border>Duplicate Rows: {report.summary.duplicateCount}</Badge>
  {#if report.summary.rulesLoaded > 0}
    <Badge color="blue" border>Rules Applied: {report.summary.rulesApplied} of {report.summary.rulesLoaded}</Badge>
  {/if}
  {#if report.newBalance !== undefined}
    <p>New Balance: <strong>{report.newBalance.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}</strong></p>
  {/if}
</div>