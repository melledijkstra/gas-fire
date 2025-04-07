<script lang="ts">
  import type { StrategyOptions } from '@/common/types';
  import type { ServerResponse, Table } from '@/common/types';
  import { Button, Fileupload, Helper, Label, Select } from 'flowbite-svelte';
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
  let canSubmit = $derived(importFile && importState.strategy);

  const onFailure = (error: ServerResponse) => alert(`Action failed! ${error}`);

  const submitDataToServer = (data: Table, importStrategy: string) => {
    serverFunctions
      .importCSV(data, importStrategy)
      .then(() => google.script.host.close())
      .catch(onFailure);
  };

  const onParseError = (error: ServerResponse) => {
    console.error(error);
    alert(`Parsing error: ${error}`);
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
    serverFunctions
      .getBankAccountOptionsCached()
      .then((serverStrategyOptions) => {
        strategyOptions = serverStrategyOptions;
      })
      .catch((reason) => onFailure(reason));
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
              Papa.parse<string[]>(newFile, {
                complete: (result) => {
                  importState.importData = result.data;
                },
                error: onParseError
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
        />
      </div>
    </div>
    <Button type="submit" disabled={!canSubmit}>IMPORT</Button>
  </div>
</form>
