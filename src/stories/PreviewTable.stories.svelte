<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import PreviewTable from '../client/components/PreviewTable.svelte';
  
  const { Story } = defineMeta({
    title: 'Components/Import/PreviewTable',
    component: PreviewTable
  });
</script>

<Story name="Default" />
