<script module lang="ts">
  import Dialog from '@/client/mobile-budget-dialog/Dialog.svelte'
  import { DIALOG_SIZES } from '@/common/settings'
  import { defineMeta } from '@storybook/addon-svelte-csf'
  import DialogDecorator from '../../.storybook/dialog-decorator.svelte'

  const { Story } = defineMeta({
    title: 'Dialogs/Mobile Budget',
    component: Dialog,
    globals: {
      backgrounds: {
        value: 'dialog',
      },
    },
  })
</script>

{#snippet template()}
  <DialogDecorator size={DIALOG_SIZES.mobileBudget} title="Mobile Budget App">
    <Dialog />
  </DialogDecorator>
{/snippet}

<Story name="Default" {template} />
