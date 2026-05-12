<script module lang="ts">
  import Dialog from '@/client/enable-banking-dialog/Dialog.svelte';
  import { DIALOG_SIZES } from "@/common/settings";
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import DialogDecorator from "../../.storybook/dialog-decorator.svelte";

  const { Story } = defineMeta({
    title: 'Dialogs/Enable Banking',
    component: Dialog,
    globals: {
      backgrounds: {
        value: 'dialog'
      }
    }
  });
</script>

{#snippet template()}
  <DialogDecorator size={DIALOG_SIZES.enableBanking} title={'Enable Banking'}>
    <Dialog />
  </DialogDecorator>
{/snippet}

<Story name="Default" {template} />
