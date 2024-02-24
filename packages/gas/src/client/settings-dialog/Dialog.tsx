import { Box, Tab, Tabs } from '@mui/material';
import { Application } from '../Application';
import { AutomaticCategorizationForm } from './components/AutomaticCategorizationForm';
import { ImportRulesForm } from './components/ImportRulesForm';
import { useState } from 'react';

export const Dialog = () => {
  const [activeTab, setActiveTab] = useState<number>(1);

  return (
    <Application>
      <Tabs
        variant="fullWidth"
        value={activeTab}
        onChange={(_event, newActiveTab) => setActiveTab(newActiveTab)}
      >
        <Tab label="Import Rules" />
        <Tab label="Automatic Categorization" />
      </Tabs>
      <Box
        mt={2}
        style={{ display: activeTab === 0 ? 'block' : 'none' }}
        className="tab col s3"
        id={`simple-tabpanel-0`}
        aria-labelledby={`simple-tab-0`}
      >
        <ImportRulesForm />
      </Box>
      <Box
        mt={2}
        style={{ display: activeTab === 1 ? 'block' : 'none' }}
        className="tab col s3"
        id={`simple-tabpanel-1`}
        aria-labelledby={`simple-tab-1`}
      >
        <AutomaticCategorizationForm />
      </Box>
    </Application>
  );
};
