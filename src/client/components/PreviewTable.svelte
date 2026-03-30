<script lang="ts">
  import type { Table, ServerResponse } from '@/common/types';
  import { serverFunctions } from '@/client/utils/serverFunctions';
  import DataTable from './DataTable.svelte';
  import { excludeRowsFromData } from '../utils/importing';
  import { appState } from '../states/app.svelte';
  import { importState } from '../states/import.svelte';
  import { Button, Spinner } from 'flowbite-svelte';

  let { tableData }: { tableData?: Table } = $props();
  // svelte-ignore state_referenced_locally
let previewData = $state<Table | undefined>(tableData);
  let isGeneratingPreview = $state(false);

  const getBrowserLocale = () => {
    if (navigator.languages != undefined) return navigator.languages[0];
    return navigator.language;
  };

  const onGeneratePreviewSuccess = (response: ServerResponse<{
    result: Table;
    newBalance?: number;
  }>) => {
    if (!response.success || !response.data) {
      appState.statusText = `Failed to create preview: ${!response.success ? response.error : 'Unknown error'}`;
      return;
    }
    const { result, newBalance } = response.data;
    const locale = getBrowserLocale()
    const newBalanceFormatted = newBalance?.toLocaleString(locale, {
      style: 'currency',
      currency: 'EUR',
    })
    appState.statusText = `Import preview set${newBalanceFormatted ? ` - new balance: ${newBalanceFormatted}` : ''}`
    previewData = result
  };

  const generatePreview = () => {
    if (!importState.importData || !importState.strategy) {
      return;
    }

    isGeneratingPreview = true;
    const dataToProcess = excludeRowsFromData(importState.importData, importState.selectedRows)
    appState.statusText = 'Data is being processed...'
    
    serverFunctions
      .generatePreview(dataToProcess, importState.strategy)
      .then(onGeneratePreviewSuccess)
      .catch((error) => appState.statusText = `Failed to create preview: ${error}`)
      .finally(() => isGeneratingPreview = false);
  };
</script>

{#if previewData}
  <DataTable table={previewData} />
{/if}

<Button
  class="my-2"
  color="green"
  disabled={!importState.importData || !importState.strategy || isGeneratingPreview}
  onclick={generatePreview}
>
  {#if isGeneratingPreview}
    <Spinner class="me-2" size="4" />
    Generating...
  {:else}
    Generate Preview
  {/if}
</Button>
