import type { Meta, StoryObj } from '@storybook/react';
import { About } from './components/About';
import { DIALOG_SIZES } from '../../common/constants';

// import css from external packages
import 'tabulator-tables/dist/css/tabulator.min.css';

const meta: Meta<typeof About> = {
  title: 'AboutDialog',
  component: About,
  args: {
    dialogSize: DIALOG_SIZES.about,
    dialogTitle: 'About',
  },
};

export default meta;

type Story = StoryObj<typeof About>;

export const Default: Story = {};
