<script lang="ts">
  import type { ImportPreviewReport, ServerResponse } from "@/common/types";
  import { serverFunctions } from "@/client/utils/serverFunctions";
  import PreviewTable from "../components/PreviewTable.svelte";
  import { excludeRowsFromData } from "../utils/importing";
  import { importState } from "../states/import.svelte";
  import { Accordion, AccordionItem, Alert, Button, Spinner } from "flowbite-svelte";
  import { ExclamationCircleSolid, InfoCircleSolid } from "flowbite-svelte-icons";
  import PreviewReportSummary from "../components/PreviewReportSummary.svelte";

  const onPreviewSuccess = (
    response: ServerResponse<ImportPreviewReport>,
  ) => {
    if (!response.success || !response.data) {
      alert(`Failed to create preview: ${!response.success ? response.error : "Unknown error"}`)
      return;
    }
    const report = response.data;

    importState.previewReport = report;
    importState.userDecisions.clear();
  };

  const triggerPreviewPipeline = () => {
    if (!importState.rawImportData || !importState.selectedBank) {
      return;
    }

    importState.isProcessing = true;
    const dataToProcess = excludeRowsFromData(
      importState.rawImportData,
      importState.selectedRows,
    );

    serverFunctions
      .previewPipeline(dataToProcess, importState.selectedBank)
      .then(onPreviewSuccess)
      .catch(
        (error) => alert(`Failed to create preview: ${error}`),
      )
      .finally(() => (importState.isProcessing = false));
  };
</script>

<div class="flex flex-col mt-2">
  <Button
    color="green"
    disabled={!importState.rawImportData ||
      !importState.selectedBank ||
      importState.isProcessing}
    onclick={triggerPreviewPipeline}
  >
    {#if importState.isProcessing}
      <Spinner class="me-2" size="4" />
      Generating...
    {:else}
      Generate Preview
    {/if}
  </Button>
</div>

<Alert color="blue" class="my-2">
  {#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
  <span class="font-medium">Import Preview</span>
  <p class="mt-1">
    This table shows how the data will be structured in
    your Google Sheet (formatting might be different). Columns marked with <strong>(auto-filled)</strong> will
    be automatically populated by Google Sheets formulas if auto-fill is enabled
    for your account configuration.
  </p>
</Alert>

{#if importState.previewReport}
  <PreviewReportSummary report={importState.previewReport} />

  {#if importState.previewReport.ruleWarnings?.length}
    <Accordion class="mb-2">
      <AccordionItem>
        {#snippet header()}
          <span class="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <ExclamationCircleSolid class="w-4 h-4" />
            Rule Warnings ({importState.previewReport.ruleWarnings.length})
          </span>
        {/snippet}
        <ul class="list-disc pl-4 text-sm">
          {#each importState.previewReport.ruleWarnings as warning}
            <li>
              <strong>{warning.ruleName}</strong> (row {warning.rowIndex}): {warning.message}
            </li>
          {/each}
        </ul>
      </AccordionItem>
    </Accordion>
  {/if}

  <PreviewTable report={importState.previewReport} />
{/if}
