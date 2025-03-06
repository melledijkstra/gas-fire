import type { Meta, StoryObj } from '@storybook/react';
import { PreviewTable } from '@/client/import-dialog/components/PreviewTable';
import { n26ImportMock } from '@/fixtures/n26';
import { ImportContextProvider } from '@/client/import-dialog/context/import-context';

const meta: Meta<typeof PreviewTable> = {
  title: 'Dialogs/Import',
  component: PreviewTable,
  args: {
    tableData: n26ImportMock,
  },
};

export default meta;

type Story = StoryObj<typeof PreviewTable>;

export const Table: Story = {
  render: (args) => {
      return (
        <ImportContextProvider setStatusText={() => {}}>
          <PreviewTable />
        </ImportContextProvider>
      )
    }
};
