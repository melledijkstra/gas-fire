<script module lang="ts">
  import { defineMeta, setTemplate } from '@storybook/addon-svelte-csf';
  import Dialog from '@/client/about-dialog/Dialog.svelte';
  import DialogDecorator from '../../.storybook/dialog-decorator.svelte';
  import { DIALOG_SIZES } from '@/common/constants';

  const { Story } = defineMeta({
    title: 'Dialogs/About',
    component: Dialog,
    parameters: {
      backgrounds: {
        default: 'dialog'
      }
    }
  });
</script>

<script>
  setTemplate(template)
</script>

{#snippet template()}
  <DialogDecorator size={DIALOG_SIZES.about} title={'About Dialog'}>
    <Dialog />
  </DialogDecorator>
{/snippet}

<Story name="Default" />
