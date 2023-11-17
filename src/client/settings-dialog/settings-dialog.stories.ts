import type { Meta, StoryObj } from '@storybook/react';
import { App } from './components/App';
import { DIALOG_SIZES } from '../../common/constants';

const meta: Meta<typeof App> = {
  title: 'SettingsDialog',
  component: App,
  args: {
    dialogSize: DIALOG_SIZES.settings,
    dialogTitle: 'Settings Dialog',
  },
};

export default meta;

type Story = StoryObj<typeof App>;

export const Default: Story = {};
