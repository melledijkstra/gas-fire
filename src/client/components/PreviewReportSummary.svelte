<script lang="ts">
  import type { ImportPreviewResult } from '@/common/types';
  import { getBrowserLocale } from '../utils/web';
  import { Badge } from 'flowbite-svelte';

  const { report }: { report: ImportPreviewResult } = $props();
  const locale = getBrowserLocale();

  const validCount = $derived.by(() => report.rows.length - report.duplicateHashes.size - report.removedHashes.size);
  const removedCount = $derived(report.removedHashes.size);
  const duplicateCount = $derived(report.duplicateHashes.size);
</script>

<div class="mb-4">
  <p>Total Rows: <Badge color="gray" class="text-base" border>{report.rows.length}</Badge></p>
  <Badge color="green" border>Valid Rows: {validCount}</Badge>
  <Badge color="red" border>Removed Rows: {removedCount}</Badge>
  <Badge color="yellow" border>Duplicate Rows: {duplicateCount}</Badge>
  {#if report.newBalance !== undefined}
    <p>New Balance: <strong>{report.newBalance.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}</strong></p>
  {/if}
</div>