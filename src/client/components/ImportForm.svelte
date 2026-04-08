<script lang="ts">
  import { Button, Dropzone, Helper, Label, Select, Spinner } from 'flowbite-svelte';
  import { serverFunctions } from '@/client/utils/serverFunctions';
  import {
    acceptedMimeTypes,
    isAllowedFile
  } from '../utils/importing';
  import Papa from 'papaparse';
  import { importState } from '@/client/states/import.svelte';
  import { onMount } from 'svelte';
  import { Logger } from '@/common/logger';
  import { onFailure } from '../utils/error-handling';

  let { onSubmit } = $props();

  let isLoadingOptions = $state(true);
  let fileError = $state<string | null>(null);
  let selectOptions = $derived.by(() =>
    Object.keys(importState.bankOptions ?? {})?.map((key) => {
      return {
        value: key,
        name: importState.bankOptions?.[key] ?? ''
      };
    })
  );

  // only proceed when:
  let canProceed = $derived(
    importState.inputFiles &&
    importState.inputFiles.length > 0 && // file was uploaded
    importState.selectedBank && // bank was selected
    !importState.isProcessing && // not currently processing
    !isLoadingOptions // not currently loading options
  );

  const onParseError = (error: { message: string }) => {
    Logger.error(error);
    onFailure(`Parsing error: ${error.message}`);
  };

  const processFile = () => {
    fileError = null;
    const [newFile] = importState.inputFiles ?? [];
    importState.rawImportData = undefined;
    importState.previewReport = undefined;
    importState.selectedRows.clear();
    if (newFile) {
      if (!isAllowedFile(newFile.type)) {
        fileError = `File type not allowed. Accepted types: ${acceptedMimeTypes.join(', ')}`;
        importState.inputFiles = undefined;
        return;
      }
      importState.isProcessing = true;
      Papa.parse<string[]>(newFile, {
        complete: (result) => {
          importState.rawImportData = result.data;
          importState.isProcessing = false;
        },
        error: (error) => {
          onParseError(error);
          importState.isProcessing = false;
        },
      });
    }
  }

  const fetchBankOptions = async () => {
    if (Object.keys(importState.bankOptions).length > 0) {
      // options are already cached, no need to fetch
      isLoadingOptions = false;
      return;
    }
    // retrieve import bank options when mounted
    isLoadingOptions = true;
    serverFunctions
      .getBankAccountOptionsCached()
      .then((response) => {
        if (response.success && response.data) {
          importState.bankOptions = response.data;
        } else {
          onFailure(response);
        }
      })
      .catch((reason) => onFailure(reason))
      .finally(() => isLoadingOptions = false);
  };

  function showFiles(files: FileList | null): string {
    console.log("showFiles fired.")
    if (!files || files.length === 0) return "No files selected.";
    return Array.from(files)
      .map((file) => file.name)
      .join(", ")
  }

  onMount(async () => {
    fetchBankOptions();
  });
</script>

<div class="flex flex-col gap-4">
  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label class="pb-2" for="file_input">{'Upload CSV'}</Label>
      <Dropzone id="my-awesome-dropzone" bind:files={importState.inputFiles} onChange={processFile} onDrop={processFile} accept="text/csv">
        <svg aria-hidden="true" class="mb-3 h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        {#if !importState.inputFiles || importState.inputFiles.length === 0}
          <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <span class="font-semibold">Click to upload</span>
            or drag and drop
          </p>
          <p class="text-xs text-gray-500 dark:text-gray-400">CSV Files</p>
        {:else}
          <p class="text-sm text-green-700">{showFiles(importState.inputFiles)}</p>
          <button class="mt-2 text-sm text-red-700 hover:underline" onclick={() => (importState.inputFiles = undefined)}>Clear Files</button>
        {/if}
      </Dropzone>
      {#if fileError}
        <Helper color="red">{fileError}</Helper>
      {:else}
        <Helper>Only CSV files are allowed</Helper>
      {/if}
    </div>
    <div>
      <Label class="pb-2" for="import-bank">
        Select Bank
      </Label>
      <Select
        id="import-bank"
        required
        items={selectOptions}
        bind:value={importState.selectedBank}
        disabled={isLoadingOptions}
      />
      {#if isLoadingOptions}
        <Helper>Loading banks...</Helper>
      {/if}
      {#if importState.selectedBank}
        <div class="mt-2">
          <table class="border-separate border-spacing-2 border border-gray-200">
            <tbody>
              <tr>
                <td>Column Mappings:</td>
                <td><strong>7</strong></td>
              </tr>
              <tr>
                <td>Import Rules Loaded:</td>
                <td><strong>13</strong></td>
              </tr>
              <tr>
                <td>Autofill columns:</td>
                <td><strong>5</strong></td>
              </tr>
              <tr>
                <td>Auto categorization:</td>
                <td><strong>enabled</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      {/if}
    </div>
  </div>
  <Button disabled={!canProceed} onclick={onSubmit}>
    {#if importState.isProcessing}
      <Spinner class="me-2" size="4" />
      {'Parsing...'}
    {:else}
      NEXT
    {/if}
  </Button>
</div>
