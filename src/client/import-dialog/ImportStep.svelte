<script lang="ts">
  import { Button, Spinner, type Table } from "flowbite-svelte";
  import { importState } from "../states/import.svelte";
  import { onFailure } from "../utils/error-handling";
  import {
    isAllowedFile,
    acceptedMimeTypes,
    excludeRowsFromData,
  } from "../utils/importing";
  import { serverFunctions } from "../utils/serverFunctions";
  import { BadgeCheckSolid } from "flowbite-svelte-icons";

  let importFinished = $state(false);
  let message = $state("Ready to import your data?");

  const submitDataToServer = (data: Table, importStrategy: string) => {
    importState.isProcessing = true;
    serverFunctions
      .importCSV(data, importStrategy)
      .then((response) => {
        if (response.success) {
          importFinished = true;
          message = response.message ?? "Import successful! This dialog will close shortly.";
          setTimeout(google.script.host.close, 3000);
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
      message = `No import file or import selectedBank selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
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
  {/if}
</div>
