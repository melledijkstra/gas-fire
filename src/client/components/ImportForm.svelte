<script lang="ts">
  import type { StrategyOptions } from '@/common/types';
  import type { ServerResponse, Table } from '@/common/types';
  import { Button, Fileupload, Helper, Label, Select, Spinner } from 'flowbite-svelte';
  import { serverFunctions } from '@/client/utils/serverFunctions';
  import {
    acceptedMimeTypes,
    excludeRowsFromData,
    isAllowedFile
  } from '../utils/importing'; 
  import Papa from 'papaparse';
  import { importState } from '@/client/states/import.svelte';
  import { onMount } from 'svelte';
  import { appState } from '../states/app.svelte';
  import { Logger } from '@/common/logger';

  let isImporting = $state(false)
  let isParsing = $state(false);
  let isLoadingOptions = $state(true);
  let strategyOptions = $state<StrategyOptions>();
  let selectOptions = $derived.by(() =>
    Object.keys(strategyOptions ?? {})?.map((key) => {
      return {
        value: key,
        name: strategyOptions?.[key] ?? ''
      };
    })
  );

  let importFile = $state<File>();
  let canSubmit = $derived(importFile && importState.strategy && !isParsing && !isLoadingOptions);

  const onFailure = (error: ServerResponse | string) => {
    let errorMsg: string = 'Unknown error';
    if (typeof error === 'string') {
      errorMsg = error;
    } else if (error.success) {
      // In case of a successful response, we don't want to show an error message
      return;
    } else {
      errorMsg = error.error;
    }

    alert(`Action failed! ${errorMsg}`);
  };

  const submitDataToServer = (data: Table, importStrategy: string) => {
    isImporting = true;
    serverFunctions
      .importCSV(data, importStrategy)
      .then((response) => {
        if (response.success) {
          google.script.host.close();
        } else {
          onFailure(response);
        }
      })
      .catch(onFailure)
      .finally(() => isImporting = false);
  };

  const onParseError = (error: { message: string }) => {
    Logger.error(error);
    onFailure(`Parsing error: ${error.message}`);
  };

  const handleFormSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    if (
      !importState.importData ||
      !importFile ||
      !isAllowedFile(importFile.type) ||
      !importState.strategy
    ) {
      appState.statusText = `No import file or import strategy selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
        ', '
      )})`;
      return;
    }

    const rowsToImport = excludeRowsFromData(
      importState.importData,
      importState.selectedRows
    );

    submitDataToServer(rowsToImport, importState.strategy);
  };

  onMount(async () => {
    // retrieve import strategy options when mounted
    isLoadingOptions = true;
    serverFunctions
      .getBankAccountOptionsCached()
      .then((response) => {
        if (response.success && response.data) {
          strategyOptions = response.data;
        } else {
          onFailure(response);
        }
      })
      .catch((reason) => onFailure(reason))
      .finally(() => isLoadingOptions = false);
  });
</script>

<form onsubmit={handleFormSubmit}>
  <div class="flex flex-col gap-5">
    <div class="grid grid-cols-2 gap-5">
      <div>
        <Label class="pb-2" for="file_input">{'Upload CSV'}</Label>
        <Fileupload
          id="file_input"
          class="mb-1"
          required
          accept="text/csv"
          onchange={(event) => {
            const newFile = event.currentTarget?.files?.[0];
            importFile = newFile;
            if (newFile) {
              isParsing = true;
              Papa.parse<string[]>(newFile, {
                complete: (result) => {
                  importState.importData = result.data;
                  isParsing = false;
                },
                error: (error) => {
                  onParseError(error);
                  isParsing = false;
                }
              });
            } else {
              delete importState.importData;
            }
          }}
        />
        <Helper>Only CSV files are allowed</Helper>
      </div>
      <div>
        <Label class="pb-2" for="import-strategy">
          Select Bank
        </Label>
        <Select
          id="import-strategy"
          required
          items={selectOptions}
          bind:value={importState.strategy}
          disabled={isLoadingOptions}
        />
        {#if isLoadingOptions}
          <Helper>Loading banks...</Helper>
        {/if}
      </div>
    </div>
    <Button type="submit" disabled={!canSubmit || isImporting || isParsing || isLoadingOptions}>
      {#if isImporting || isParsing}
        <Spinner class="me-2" size="4" />
        {isParsing ? 'Parsing...' : 'Importing...'}
      {:else}
        IMPORT
      {/if}
    </Button>
  </div>
</form>
