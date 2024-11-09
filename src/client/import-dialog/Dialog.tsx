import { useState } from 'react';
import { Application } from '../Application';
import { PreviewTable } from './components/PreviewTable';
import { Typography, Box, Tabs, Tab } from '@mui/material';
import { ImportForm } from './components/ImportForm';
import {
  ImportContextProvider,
  useImportContext,
} from './context/import-context';
import { DataTable } from './components/DataTable';

const RawTable = () => {
  const { importData, addSelectedRow, removeSelectedRow } = useImportContext();

  const onRowToggled = (index: number, on: boolean) => {
    console.log('Row selected:', index);
    if (on) {
      addSelectedRow(index);
    } else {
      removeSelectedRow(index);
    }
  };

  return (
    importData && (
      <DataTable
        table={importData}
        options={{ selectable: true }}
        onRowToggled={onRowToggled}
      />
    )
  );
};

export const Dialog = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [statusText, setStatusText] = useState<string>('-');

  return (
    <Application>
      <ImportContextProvider
        statusText={statusText}
        setStatusText={setStatusText}
      >
        <ImportForm />
        <Typography variant="body1" mb={2}>
          {statusText}
        </Typography>
        <Tabs
          value={activeTab}
          onChange={(_event, newActiveTab) => setActiveTab(newActiveTab)}
        >
          <Tab label="Raw Data" />
          <Tab label="Import Preview" />
        </Tabs>
        <Box
          mt={2}
          style={{ display: activeTab === 0 ? 'block' : 'none' }}
          className="tab col s3"
          id={`raw-input-table`}
        >
          <RawTable />
        </Box>
        <Box
          mt={2}
          style={{ display: activeTab === 1 ? 'block' : 'none' }}
          className="tab col s3"
          id={`import-preview-table`}
        >
          <PreviewTable />
        </Box>
      </ImportContextProvider>
    </Application>
  );
};
