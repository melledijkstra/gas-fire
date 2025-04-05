<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewTable from '../client/components/PreviewTable.svelte';
  import { N26ImportMock } from '@/fixtures/n26';
  
  const { Story } = defineMeta({
    title: 'Components/PreviewTable',
    component: PreviewTable,
    args: {
      tableData: N26ImportMock,
    },
  });
</script>

<Story name="Default" />
