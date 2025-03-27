<script lang="ts">
  import type { Table } from '@/common/types';
  import { serverFunctions } from '@/client/utils/serverFunctions';
  import DataTable from './DataTable.svelte';
  import { excludeRowsFromData } from '../utils/importing';
  import { appState } from '../states/app.svelte';
  import { importState } from '../states/import.svelte';
  import { Button } from 'flowbite-svelte';

  let { tableData }: { tableData?: Table } = $props();

  const getBrowserLocale = () => {
    if (navigator.languages != undefined) return navigator.languages[0];
    return navigator.language;
  };

  let previewData = $state<Table | undefined>(tableData);

  const onGeneratePreviewSuccess = ({
    result,
    newBalance,
  }: {
    result: Table;
    newBalance?: number;
  }) => {
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

    const dataToProcess = excludeRowsFromData(importState.importData, importState.selectedRows)
    appState.statusText = 'Data is being processed...'
    
    serverFunctions
      .generatePreview(dataToProcess, importState.strategy)
      .then(onGeneratePreviewSuccess)
      .catch((error) => appState.statusText = `Failed to create preview: ${error}`);
  };
</script>

{#if previewData}
  <DataTable table={previewData} />
{/if}

<Button
  class="my-2"
  color="green"
  disabled={!importState.importData || !importState.strategy}
  onclick={generatePreview}
>
  Generate Preview
</Button>
