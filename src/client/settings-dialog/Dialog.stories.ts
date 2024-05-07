import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from './Dialog';
import { DIALOG_SIZES } from '../../common/constants';

const meta: Meta<typeof Dialog> = {
  title: 'Dialogs/Settings',
  component: Dialog,
  args: {
    dialogSize: DIALOG_SIZES.settings,
    dialogTitle: 'Settings Dialog',
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};
