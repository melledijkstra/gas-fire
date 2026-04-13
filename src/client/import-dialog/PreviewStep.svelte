<script lang="ts">
  import type { ImportPreviewResult, ServerResponse } from "@/common/types";
  import PreviewTable from "../components/PreviewTable.svelte";
  import { excludeRowsFromData } from "../utils/importing";
  import { importState } from "../states/import.svelte";
  import { Alert, Button, Spinner } from "flowbite-svelte";
  import { InfoCircleSolid } from "flowbite-svelte-icons";
  import PreviewReportSummary from "../components/PreviewReportSummary.svelte";
  import { serverFunctions } from "@/client/utils/serverFunctions";

  const isErrorResponse = (response: ServerResponse<any>): boolean => {
    return !response?.success;
  };

  const onPreviewSuccess = (response: ServerResponse<ImportPreviewResult>) => {
    console.log("Preview response:", response);
    if (!response)  {
      alert("Failed to create preview: No response from server")
      return;
    } else if (isErrorResponse(response)) {
      alert(`Failed to create preview: ${!response.success ? response.error : "Unknown error"}`)
      return;
    } else if (response.success === true) {
      importState.previewReport = response.data;
      importState.userDecisions.clear();
    }
  };

  const triggerPreviewPipeline = () => {
    if (!importState.rawImportData || !importState.selectedAccount) {
      return;
    }

    importState.isProcessing = true;
    const dataToProcess = excludeRowsFromData(
      importState.rawImportData,
      importState.selectedRows,
    );

    serverFunctions
      .previewPipeline(dataToProcess, importState.selectedAccount)
      .then(onPreviewSuccess)
      .catch(
        (error) => alert(`Server Error: ${error}`),
      )
      .finally(() => (importState.isProcessing = false));
  };
</script>

<div class="flex flex-col mt-2">
  <Button
    color="green"
    disabled={!importState.rawImportData ||
      !importState.selectedAccount ||
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
  <PreviewTable report={importState.previewReport} />
{/if}
