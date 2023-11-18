import type { Meta, StoryObj } from '@storybook/react';
import { Dialog } from './Dialog';
import { DIALOG_SIZES } from '../../common/constants';

// import css from external packages
import 'tabulator-tables/dist/css/tabulator.min.css';

const meta: Meta<typeof Dialog> = {
  title: 'ImportDialog',
  component: Dialog,
  args: {
    dialogSize: DIALOG_SIZES.import,
    dialogTitle: 'File upload dialog',
  },
};

export default meta;

type Story = StoryObj<typeof Dialog>;

export const Default: Story = {};
