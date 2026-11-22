<script module lang="ts">
  import Dialog from '@/client/mobile-budget-dialog/Dialog.svelte'
  import { defineMeta } from '@storybook/addon-svelte-csf'

  const { Story } = defineMeta({
    title: 'WebApp/Mobile Budget',
    component: Dialog,
  })
</script>

{#snippet template()}
  <div class="mx-auto max-w-md border border-gray-200 shadow-lg dark:border-gray-800">
    <Dialog />
  </div>
{/snippet}

<Story name="Default" {template} />
