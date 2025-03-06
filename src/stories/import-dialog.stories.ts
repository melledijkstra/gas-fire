import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from '@/client/import-dialog/Dialog';
import { DIALOG_SIZES } from '@/common/constants';

const meta: Meta<typeof Dialog> = {
  title: 'Dialogs/Import',
  component: Dialog,
  args: {
    dialogSize: DIALOG_SIZES.import,
    dialogTitle: 'File upload dialog',
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};
