<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewTable from '../client/components/PreviewTable.svelte';
  import { n26ImportMock } from '@/fixtures/n26';
  
  const { Story } = defineMeta({
    title: 'Components/PreviewTable',
    component: PreviewTable,
    args: {
      tableData: n26ImportMock,
    },
  });
</script>

<Story name="Default" />
