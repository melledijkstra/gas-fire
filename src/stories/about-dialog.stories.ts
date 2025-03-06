import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from '@/client/about-dialog/Dialog';
import { DIALOG_SIZES } from '@/common/constants';

const meta: Meta<typeof Dialog> = {
  title: 'Dialogs/About',
  component: Dialog,
  args: {
    dialogSize: DIALOG_SIZES.about,
    dialogTitle: 'About',
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};
