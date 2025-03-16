
<script module lang="ts">
  import { defineMeta, setTemplate } from '@storybook/addon-svelte-csf';
  import DialogDecorator from "../../.storybook/dialog-decorator.svelte";
  import Dialog from '@/client/import-dialog/Dialog.svelte';
  import { DIALOG_SIZES } from '@/common/constants';
  
  const { Story } = defineMeta({
    title: 'Dialogs/Import',
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
  <DialogDecorator size={DIALOG_SIZES.import} title={'File upload dialog'}>
    <Dialog />
  </DialogDecorator>
{/snippet}

<Story name="Default" />
