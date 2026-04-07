<script lang="ts">
  import type { ImportPreviewReport, ServerResponse } from "@/common/types";
  import { serverFunctions } from "@/client/utils/serverFunctions";
  import PreviewTable from "../components/PreviewTable.svelte";
  import { excludeRowsFromData } from "../utils/importing";
  import { importState } from "../states/import.svelte";
  import { Alert, Button, Spinner } from "flowbite-svelte";
  import { InfoCircleSolid } from "flowbite-svelte-icons";
  import PreviewReportSummary from "../components/PreviewReportSummary.svelte";

  let statusText = $state("");

  const onPreviewSuccess = (
    response: ServerResponse<ImportPreviewReport>,
  ) => {
    if (!response.success || !response.data) {
      statusText = `Failed to create preview: ${!response.success ? response.error : "Unknown error"}`;
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
    statusText = "Data is being processed...";

    serverFunctions
      .previewPipeline(dataToProcess, importState.selectedBank)
      .then(onPreviewSuccess)
      .catch(
        (error) => (statusText = `Failed to create preview: ${error}`),
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
  {#if statusText}
    <p class="mt-1">{statusText}</p>
  {/if}
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
  <PreviewTable report={importState.previewReport} />
{/if}
