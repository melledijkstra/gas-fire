<script lang="ts">
  import type { ImportPreviewReport } from '@/common/types';
  import { getBrowserLocale } from '../utils/web';
  import { Badge, Accordion, AccordionItem } from 'flowbite-svelte';

  const { report } = $props<{ report: ImportPreviewReport }>();

  const locale = getBrowserLocale();
</script>

<div class="mb-4">
  <p class="mb-2">Total Rows: <Badge color="gray" class="text-base" border>{report.summary.totalRows}</Badge></p>
  <Badge color="green" border>Valid Rows: {report.summary.validCount}</Badge>
  <Badge color="red" border>Removed Rows: {report.summary.removedCount}</Badge>
  <Badge color="yellow" border>Duplicate Rows: {report.summary.duplicateCount}</Badge>
  <Badge color="indigo" border>Rules Applied: {report.summary.rulesApplied}</Badge>
  {#if report.newBalance !== undefined}
    <p class="mt-2">New Balance: <strong>{report.newBalance.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}</strong></p>
  {/if}

  {#if report.ruleWarnings && report.ruleWarnings.length > 0}
    <div class="mt-4">
      <Accordion flush>
        <AccordionItem paddingFlush="py-2">
          <span slot="header" class="text-yellow-600 dark:text-yellow-400 font-medium text-sm flex gap-2 items-center">
            Rule Warnings ({report.ruleWarnings.length})
          </span>
          <ul class="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
            {#each report.ruleWarnings as warning}
              <li><strong>{warning.ruleName}:</strong> {warning.message}</li>
            {/each}
          </ul>
        </AccordionItem>
      </Accordion>
    </div>
  {/if}
</div>