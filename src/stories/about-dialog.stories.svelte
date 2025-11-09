<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import Dialog from '@/client/about-dialog/Dialog.svelte';
  import DialogDecorator from '../../.storybook/dialog-decorator.svelte';
  import { DIALOG_SIZES } from '@/common/constants';

  const { Story } = defineMeta({
    title: 'Dialogs/About',
    component: Dialog,
    globals: {
      backgrounds: {
        value: 'dialog'
      }
    }
  });
</script>

{#snippet template()}
  <DialogDecorator size={DIALOG_SIZES.about} title={'About Dialog'}>
    <Dialog />
  </DialogDecorator>
{/snippet}

<Story name="Default" {template} />
