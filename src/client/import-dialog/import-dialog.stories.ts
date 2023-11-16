import type { Meta, StoryObj } from '@storybook/react';
import { App } from './components/App';
import { DIALOG_SIZES } from '../../common/constants';

// import css from external packages
import 'tabulator-tables/dist/css/tabulator.min.css';
import 'materialize-css/dist/css/materialize.min.css';

const meta: Meta<typeof App> = {
  title: 'ImportDialog',
  component: App,
  args: {
    dialogSize: DIALOG_SIZES.import,
    dialogTitle: 'File upload dialog',
  },
};

export default meta;

type Story = StoryObj<typeof App>;

export const Default: Story = {};
