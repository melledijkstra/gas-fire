<script lang="ts">
  import type { Table, ServerResponse } from "@/common/types";
  import { serverFunctions } from "@/client/utils/serverFunctions";
  import DataTable from "./DataTable.svelte";
  import { excludeRowsFromData } from "../utils/importing";
  import { importState } from "../states/import.svelte";
  import { Alert, Button, Spinner } from "flowbite-svelte";
  import { InfoCircleSolid } from "flowbite-svelte-icons";

  const getBrowserLocale = () => {
    if (navigator.languages != undefined) return navigator.languages[0];
    return navigator.language;
  };

  const onGeneratePreviewSuccess = (
    response: ServerResponse<{
      result: Table;
      newBalance?: number;
    }>,
  ) => {
    if (!response.success || !response.data) {
      importState.statusText = `Failed to create preview: ${!response.success ? response.error : "Unknown error"}`;
      return;
    }
    const { result, newBalance } = response.data;
    const locale = getBrowserLocale();
    const newBalanceFormatted = newBalance?.toLocaleString(locale, {
      style: 'currency',
      currency: 'EUR',
    })
    importState.statusText = `Import preview set${newBalanceFormatted ? ` - new balance: ${newBalanceFormatted}` : ''}`
    importState.previewData = result
  };

  const generatePreview = () => {
    if (!importState.rawImportData || !importState.selectedBank) {
      return;
    }

    importState.isProcessing = true;
    const dataToProcess = excludeRowsFromData(
      importState.rawImportData,
      importState.selectedRows,
    );
    importState.statusText = "Data is being processed...";

    serverFunctions
      .generatePreview(dataToProcess, importState.selectedBank)
      .then(onGeneratePreviewSuccess)
      .catch(
        (error) => (importState.statusText = `Failed to create preview: ${error}`),
      )
      .finally(() => (importState.isProcessing = false));
  };
</script>

<Alert color="blue" class="my-4">
  {#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
  <span class="font-medium">Import Preview</span>
  <p class="mt-1">
    This table shows how the data will be structured in
    your Google Sheet (formatting might be different). Columns marked with <strong>(auto-filled)</strong> will
    be automatically populated by Google Sheets formulas if auto-fill is enabled
    for your account configuration.
  </p>
</Alert>

{#if importState.previewData}
  <DataTable table={importState.previewData} />
{/if}

<Button
  class="my-2" color="green"
  disabled={!importState.rawImportData ||
    !importState.selectedBank ||
    importState.isProcessing}
  onclick={generatePreview}
>
  {#if importState.isProcessing}
    <Spinner class="me-2" size="4" />
    Generating...
  {:else}
    Generate Preview
  {/if}
</Button>
