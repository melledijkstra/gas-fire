<script lang='ts'>
  import { StrategyOption } from '@/common/types';
  import type { ServerResponse, Table } from '@/common/types';
  // import {
  //   Button,
  //   FormControl,
  //   Grid,
  //   Icon,
  //   NativeSelect,
  //   Stack,
  // } from '@mui/material';
  import { serverFunctions } from '@/client/utils/serverFunctions';
  import {
    acceptedMimeTypes,
    excludeRowsFromData,
    isAllowedFile,
  } from '../utils';
  import Papa from 'papaparse';
  import { importState } from '@/client/states/import.svelte';
  import { onMount } from 'svelte';
  import '@/client/app.css';

  let strategyOptions = $state<typeof StrategyOption>();
  let importFile = $state<File>();
  let canSubmit = $derived(importFile && importState.strategy);

  const onFailure = (error: ServerResponse) => alert(`Action failed! ${error}`);

  const submitDataToServer = (data: Table, importStrategy: StrategyOption) => {
    serverFunctions
      .processCSV(data, importStrategy)
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
      importState.statusText =  `No import file or import strategy selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
          ', '
        )})`
      return;
    }

    const rowsToImport = excludeRowsFromData(importState.importData, importState.selectedRows);

    submitDataToServer(rowsToImport, importState.strategy);
  };

  onMount(async () => {
    // retrieve import strategy options when mounted
    serverFunctions
      .getStrategyOptions()
      .then((serverStrategyOptions) => {
        strategyOptions = serverStrategyOptions
      })
      .catch((reason) => onFailure(reason));
  })

  $effect(() => {
    if (importFile) {
      Papa.parse<string[]>(importFile, {
        complete: (result) => {
          importState.importData = result.data
        },
        error: onParseError,
      });
    } else {
      delete importState.importData
    }
  });
  
  console.log('rendering ImportForm')
</script>

<form class="border-2 border-red-300" onsubmit={handleFormSubmit}>
  <!-- <Stack spacing={5}> -->
    <!-- <Grid container> -->
      <!-- <Grid item xs={6}> -->
        <!-- <Button
          component="label"
          variant="outlined"
          startIcon={<Icon>upload_file</Icon>}
          sx={{ marginRight: '1rem' }}
        > -->
          
        <p class="mb-4 text-green-300">
          This is a test
        </p>

          <label
            class="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
            for="file_input">{importFile?.name ?? 'Upload CSV'}</label>
          <input
            id="file_input"
            class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
            required
            type="file"
            accept="text/csv"
            onchange={(event) => {
              importFile = event.currentTarget.files?.[0];
            }}>
        <!-- </Button> -->
      <!-- </Grid> -->
      <!-- <Grid item xs={6}> -->
        <!-- <FormControl fullWidth> -->
          <select
            required
            id="import-strategy"
            onchange={(event) => {
              importState.strategy = event.currentTarget.value as StrategyOption;
            }}
          >
            <option value="" disabled>
              Choose Bank
            </option>
            {#if strategyOptions}
              {#each Object.keys(strategyOptions) as key}
                <option
                  value={
                    StrategyOption[key as keyof typeof StrategyOption]
                  }
                >
                  {key}
                </option>
              {/each}
            {/if}
          </select>
        <!-- </FormControl> -->
      <!-- </Grid> -->
    <!-- </Grid> -->
    <!-- <Grid container justifyContent={'flex-end'}> -->
      <button type="submit" disabled={!canSubmit}>IMPORT</button>
      <!-- <Button
        variant="contained"
        color="primary"
      >
        IMPORT
      </Button> -->
    <!-- </Grid>
  </Stack> -->
</form>
