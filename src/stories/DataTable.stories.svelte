<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DataTable from '../client/components/DataTable.svelte';
  import { LargeImportMock } from '@/fixtures/large-csv-mock';
  
  const { Story } = defineMeta({
    title: 'Components/DataTable',
    component: DataTable,
    args: {
      table: LargeImportMock,
    },
  });
</script>

<Story name="Default" />

<Story name="Selectable" args={{ selectable: true }} />

<Story name="With duplicate rows" args={{ duplicateRows: new Set([1,4,5,7,13]) }} />
