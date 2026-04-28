<script lang="ts">
  import type { ImportPreviewResult } from '@/common/types';
  import { getBrowserLocale } from '../utils/web';
  import { Badge, Accordion, AccordionItem } from 'flowbite-svelte';

  const { report }: { report: ImportPreviewResult } = $props()
  const locale = getBrowserLocale()

  const ruleEngineResult = $derived(report.ruleEngine)
  const removedCount = $derived(ruleEngineResult?.removedHashes?.length ?? 0)
  const duplicateCount = $derived(report.duplicateHashes.length)
  const validCount = $derived(report.table.data.length - duplicateCount - removedCount)
  
  const totalRuleCount = $derived(report.ruleEngine?.rulesCount ?? 0)
  const rulesApplied = $derived(report.ruleEngine?.appliedRules?.length ?? 0)
  const warnings = $derived(report.ruleEngine?.warnings ?? [])
</script>

<div class="mb-4">
  <p class="mb-2">Total Rows: <Badge color="gray" class="text-base" border>{report.table.data.length}</Badge></p>
  <Badge color="green" border>Valid Rows: {validCount}</Badge>
  <Badge color="red" border>Removed Rows: {removedCount}</Badge>
  <Badge color="yellow" border>Duplicate Rows: {duplicateCount}</Badge>
  <Badge color="indigo" border>Rules Applied: {rulesApplied} / {totalRuleCount}</Badge>
  {#if report.newBalance !== undefined}
    <p class="mt-2">New Balance: <strong>{report.newBalance.toLocaleString(locale, { style: 'currency', currency: 'EUR' })}</strong></p>
  {/if}

  {#if warnings.length > 0}
    <div class="mt-4">
      <Accordion flush>
        <AccordionItem>
          {#snippet header()}
            <span class="text-yellow-600 dark:text-yellow-400 font-medium text-sm flex gap-2 items-center">
              Rule Warnings ({warnings.length})
            </span>
          {/snippet}
          <ul class="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400">
            {#each warnings as warning}
              <li><strong>{warning.ruleName}:</strong> {warning.message}</li>
            {/each}
          </ul>
        </AccordionItem>
      </Accordion>
    </div>
  {/if}
</div>