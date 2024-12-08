import { useEffect, useState } from 'react';
import { Typography, Box, Tabs, Tab } from '@mui/material';
import { ServerResponse } from '@/common/types';
import { Application } from '../Application';
import { serverFunctions } from '../utils/serverFunctions';
import { PreviewTable } from './components/PreviewTable';
import { ImportForm } from './components/ImportForm';
import {
  ImportContextProvider,
  useImportContext,
} from './context/import-context';
import { DataTable } from './components/DataTable';

const onFailure = (error: ServerResponse) => alert(`Action failed! ${error}`);

const RawTable = () => {
  const { importData } = useImportContext();

  return (
    importData && (
      <DataTable table={importData} options={{ selectable: true }} />
    )
  );
};

export const Dialog = () => {
  const [accountOptions, setAccountOptions] = useState<Record<string, string>>(
    {}
  );
  const [activeTab, setActiveTab] = useState(0);
  const [statusText, setStatusText] = useState<string>('-');

  useEffect(() => {
    // retrieve possible account options when mounted
    serverFunctions
      .getAccountOptions()
      .then((accounts) => {
        setAccountOptions(accounts);
      })
      .catch((reason) => onFailure(reason));
  }, []);

  return (
    <Application>
      <ImportContextProvider
        accountOptions={accountOptions}
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
