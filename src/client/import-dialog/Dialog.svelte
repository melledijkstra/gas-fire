<script lang="ts">
  import Application from '../Application.svelte';
  // import { PreviewTable } from './components/PreviewTable';
  // import { Typography, Box, Tabs, Tab } from '@mui/material';
  import ImportForm from '../components/ImportForm.svelte';
  // import { DataTable } from './components/DataTable';
  import { appState } from '../states/app.svelte';
  import Test from '../components/Test.svelte';

  let activeTab = $state(0);
</script>

<!-- {#snippet rawTable(importData)}
  <DataTable table={importData} options={{ selectable: true }} />
{/snippet} -->

<Application>
  <ImportForm />
  <Test />
  <!-- <Typography variant="body1" mb={2}> -->
  <p class="text-blue-600 text-5xl">
    {appState.statusText}
  </p>

  <p>{activeTab}</p>
  <!-- </Typography> -->
  <!-- <Tabs
    value={activeTab}
    onChange={(_event, newActiveTab) => setActiveTab(newActiveTab)}
  >
    <Tab label="Raw Data" />
    <Tab label="Import Preview" />
  </Tabs>
  <Box
    mt={2}
    style={{ display: activeTab === 0 ? 'block' : 'none' }}
    className="tab col s3"
    id={`raw-input-table`}
  >
    <RawTable />
  </Box>
  <Box
    mt={2}
    style={{ display: activeTab === 1 ? 'block' : 'none' }}
    className="tab col s3"
    id={`import-preview-table`}
  >
    <PreviewTable />
  </Box> -->
</Application>
