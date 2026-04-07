<script lang="ts">
  import { Button, Fileupload, Helper, Label, Select, Spinner } from 'flowbite-svelte';
  import { serverFunctions } from '@/client/utils/serverFunctions';
  import {
    acceptedMimeTypes,
    isAllowedFile
  } from '../utils/importing';
  import Papa from 'papaparse';
  import { importState } from '@/client/states/import.svelte';
  import { onMount } from 'svelte';
  import { Logger } from '@/common/logger';
  import type { ChangeEventHandler } from 'svelte/elements';
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

  const processFile: ChangeEventHandler<HTMLInputElement> = () => {
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

  onMount(async () => {
    fetchBankOptions();
  });
</script>

<div class="flex flex-col gap-4">
  <div class="grid grid-cols-2 gap-4">
    <div>
      <Label class="pb-2" for="file_input">{'Upload CSV'}</Label>
      <Fileupload
        id="file_input"
        class="mb-1"
        required
        accept="text/csv"
        bind:files={importState.inputFiles}
        onchange={processFile}
      />
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
