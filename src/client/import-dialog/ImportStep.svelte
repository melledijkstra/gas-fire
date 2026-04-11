<script lang="ts">
  import { Button, Spinner, Badge, Accordion, AccordionItem } from "flowbite-svelte";
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
  let rulesAppliedCount = $state(0);
  let ruleWarnings = $state<{ruleName: string, message: string}[]>([]);

  const submitDataToServer = (data: RawTable, importStrategy: string) => {
    importState.isProcessing = true;

    // Convert SvelteMap to a standard Object for JSON serialization via RPC
    const userDecisionsObj = Object.fromEntries(importState.userDecisions);

    serverFunctions
      .importPipeline(data, importStrategy, userDecisionsObj)
      .then((response) => {
        if (response.success && response.data) {
          importFinished = true;
          message = response.data.message ?? "Import successful!";
          rulesAppliedCount = response.data.rulesAppliedCount ?? 0;
          ruleWarnings = response.data.ruleWarnings ?? [];
        } else if (response.success && !response.data) {
          importFinished = true;
          message = "Import successful!";
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

<div class="flex flex-col items-center gap-4 h-[30rem] justify-center">
  {#if !importFinished}
    <p class="text-2xl text-center">{message}</p>
    <Button disabled={importState.isProcessing} onclick={handleFormSubmit}>
      {#if importState.isProcessing}
        <Spinner class="me-2" size="4" />
        {"Importing..."}
      {:else}
        IMPORT
      {/if}
    </Button>
  {:else}
    <BadgeCheckSolid class="w-32 h-32" color="green" />
    <p class="text-2xl text-center font-medium">{message}</p>
    
    {#if rulesAppliedCount > 0}
      <Badge color="indigo" class="text-sm px-3 py-1">Rules Applied: {rulesAppliedCount}</Badge>
    {/if}

    {#if ruleWarnings && ruleWarnings.length > 0}
      <div class="w-full max-w-md mt-4">
        <Accordion flush>
          <AccordionItem paddingFlush="py-2">
            <span slot="header" class="text-yellow-600 dark:text-yellow-400 font-medium text-sm flex gap-2 items-center">
              Rule Warnings ({ruleWarnings.length})
            </span>
            <ul class="list-disc pl-5 text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
              {#each ruleWarnings as warning}
                <li class="text-left mb-1"><strong>{warning.ruleName}:</strong> {warning.message}</li>
              {/each}
            </ul>
          </AccordionItem>
        </Accordion>
      </div>
    {/if}
    
    <Button color="alternative" class="mt-4" onclick={() => google.script.host.close()}>
      Close
    </Button>
  {/if}
</div>
