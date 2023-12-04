import type { Meta, StoryObj } from '@storybook/react';
import { PreviewTable } from './PreviewTable';
import { n26ImportMock } from '../../../mocks/import-csv';

const meta: Meta<typeof PreviewTable> = {
  title: 'ImportDialog',
  component: PreviewTable,
  args: {
    tableData: n26ImportMock,
  },
};

export default meta;

type Story = StoryObj<typeof PreviewTable>;

export const Table: Story = {};
