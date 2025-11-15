<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DataTable from '../client/components/DataTable.svelte';
  import { N26ImportMock } from '@/fixtures/n26';
  
  const { Story } = defineMeta({
    title: 'Components/DataTable',
    component: DataTable,
    args: {
      table: N26ImportMock,
    },
  });
</script>

<Story name="Default" />
