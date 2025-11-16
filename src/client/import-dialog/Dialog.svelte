<script lang="ts">
  import { Tabs, TabItem } from 'flowbite-svelte';
  import Application from '../Application.svelte';
  import ImportForm from '../components/ImportForm.svelte';
  import { appState } from '../states/app.svelte';
  import { importState } from '../states/import.svelte';
  import DataTable from '../components/DataTable.svelte';
  import PreviewTable from '../components/PreviewTable.svelte';
</script>

<Application>
  <ImportForm />

  <p class="text-base my-2">
    {appState.statusText}
  </p>

  <Tabs tabStyle="underline" classes={{ content: "p-0 m-0" }}>
    <TabItem open id="raw-input-table" title="Raw Data">
      {#if importState.importData}
        <DataTable table={importState.importData} options={{ selectable: true }} />
      {/if}
    </TabItem>
    <TabItem title="Import Preview">
      <PreviewTable />
    </TabItem>
  </Tabs>
</Application>
