import type { Meta, StoryObj } from '@storybook/react';
import { PreviewTable } from './PreviewTable';
import { N26ImportMock } from '@/fixtures/N26';

const meta: Meta<typeof PreviewTable> = {
  title: 'Dialogs/Import',
  component: PreviewTable,
  args: {
    tableData: N26ImportMock,
  },
};

export default meta;

type Story = StoryObj<typeof PreviewTable>;

export const Table: Story = {};
