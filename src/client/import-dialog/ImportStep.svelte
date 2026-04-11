<script lang="ts">
  import { Button, Spinner } from "flowbite-svelte";
  import { importState } from "../states/import.svelte";
  import { onFailure } from "../utils/error-handling";
  import {
    isAllowedFile,
    acceptedMimeTypes,
    excludeRowsFromData,
  } from "../utils/importing";
  import { serverFunctions } from "../utils/serverFunctions";
  import { BadgeCheckSolid } from "flowbite-svelte-icons";
  import type { RawTable } from "@/common/types";

  let importFinished = $state(false);
  let message = $state("Ready to import your data?");

  const submitDataToServer = (data: RawTable, importStrategy: string) => {
    importState.isProcessing = true;

    // Convert SvelteMap to a standard Object for JSON serialization via RPC
    const userDecisionsObj = Object.fromEntries(importState.userDecisions);

    serverFunctions
      .importPipeline(data, importStrategy, userDecisionsObj)
      .then((response) => {
        if (response.success) {
          importFinished = true;
          message = response.message ?? "Import successful!";
        } else {
          onFailure(response);
        }
      })
      .catch(onFailure)
      .finally(() => (importState.isProcessing = false));
  };

  const handleFormSubmit = () => {
    if (
      !importState.rawImportData ||
      !importState.inputFiles ||
      !isAllowedFile(importState.inputFiles[0].type) ||
      !importState.selectedBank
    ) {
      message = `No file or bank selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
        ", ",
      )})`;
      return;
    }

    const rowsToImport = excludeRowsFromData(
      importState.rawImportData,
      importState.selectedRows,
    );

    submitDataToServer(rowsToImport, importState.selectedBank);
  };
</script>

<div class="flex flex-col items-center gap-4 h-96 justify-center">
  <p class="text-2xl text-center">{message}</p>
  {#if !importFinished}
    <Button disabled={importState.isProcessing} onclick={handleFormSubmit}>
      {#if importState.isProcessing}
        <Spinner class="me-2" size="4" />
        {"Importing..."}
      {:else}
        IMPORT
      {/if}
    </Button>
  {:else}
    <BadgeCheckSolid class="w-40 h-40" color="green" />
    <Button color="light" onclick={() => google.script.host.close()}>Close</Button>
  {/if}
</div>
