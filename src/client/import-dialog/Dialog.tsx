import React, { useEffect, useState } from 'react';
import { serverFunctions } from '../utils/serverFunctions';
import { StrategyOption, ServerResponse, Table } from '../../common/types';
import { isAllowedFile, acceptedMimeTypes } from './utils';
import Papa from 'papaparse';
import { Application } from '../Application';
import { PreviewTable } from './components/PreviewTable';
import {
  Button,
  FormControl,
  Grid,
  Typography,
  NativeSelect,
  Stack,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';

export const Dialog = () => {
  const [strategyOptions, setStrategyOptions] =
    useState<typeof StrategyOption>(StrategyOption);
  // The strategy currently selected by the user
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyOption>();
  const [statusText, setStatusText] = useState<string>('-');

  const [tableData, setTableData] = useState<Table>([]);

  const [importFile, setImportFile] = useState<File>();

  useEffect(() => {
    // retrieve import strategy options when mounted
    serverFunctions
      .getStrategyOptions()
      .then((serverStrategyOptions) => {
        setStrategyOptions(serverStrategyOptions);
      })
      .catch((reason) => onFailure(reason));
  }, []);

  useEffect(() => {
    if (!selectedStrategy || !importFile) {
      setStatusText('File and strategy need to be set to generate preview!');
      return;
    }

    // clear table data
    setTableData([]);

    setStatusText('Data is being processed...');
    Papa.parse<string[]>(importFile, {
      complete: (result) => generatePreview(result.data, selectedStrategy),
      error: onParseError,
    });
  }, [selectedStrategy, importFile]);

  const onSuccess = (response: ServerResponse) => {
    setStatusText(`Action successful! ${response.message}`);
    google.script.host.close();
  };

  const onFailure = (error: ServerResponse) => alert(`Action failed! ${error}`);

  const submitDataToServer = (data: Table, importStrategy: StrategyOption) => {
    serverFunctions
      .processCSV(data, importStrategy)
      .then((response) => onSuccess(response))
      .catch(onFailure);
  };

  const onParseError = (error: ServerResponse) => {
    console.error(error);
    alert(`Parsing error: ${error}`);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    console.log({ formData });
    if (!importFile || !isAllowedFile(importFile.type) || !selectedStrategy) {
      setStatusText(
        `No import file or import strategy selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
          ', '
        )})`
      );
      return;
    }
    Papa.parse<string[]>(importFile, {
      complete: (result) => submitDataToServer(result.data, selectedStrategy),
      error: onParseError,
    });
  };

  const generatePreview = (data: Table, strategy: StrategyOption) => {
    serverFunctions
      .generatePreview(data, strategy)
      .then(onGeneratePreviewSuccess)
      .catch(onFailure);
  };

  const onGeneratePreviewSuccess = ({
    result,
    newBalance,
  }: {
    result: Table;
    newBalance?: number;
  }) => {
    setStatusText(
      `Import preview set${
        newBalance ? `\nNew balance: ${newBalance.toFixed(2)}` : ''
      }`
    );
    setPreview(result);
  };

  const setPreview = (data: Table) => {
    setTableData(data);
  };

  const canSubmit = importFile && selectedStrategy;

  return (
    <Application>
      <form onSubmit={handleFormSubmit}>
        <Stack spacing={5}>
          <Grid container>
            <Grid item xs={6}>
              <Button
                component="label"
                variant="outlined"
                startIcon={<UploadFileIcon />}
                sx={{ marginRight: '1rem' }}
              >
                {importFile ? importFile.name : 'Upload CSV'}
                <input
                  required
                  type="file"
                  accept="text/csv"
                  hidden
                  onChange={(event) => {
                    setImportFile(event.target.files?.[0]);
                  }}
                />
              </Button>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <NativeSelect
                  required
                  id="import-strategy"
                  inputProps={{
                    id: 'strategy-import-native',
                  }}
                  onChange={(event) => {
                    setSelectedStrategy(event.target.value as StrategyOption);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    Choose Bank
                  </option>
                  {strategyOptions
                    ? Object.keys(strategyOptions).map((key) => (
                        <option
                          key={key}
                          value={
                            StrategyOption[key as keyof typeof StrategyOption]
                          }
                        >
                          {key}
                        </option>
                      ))
                    : []}
                </NativeSelect>
              </FormControl>
            </Grid>
          </Grid>
          <Grid container justifyContent={'flex-end'}>
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={!canSubmit}
            >
              IMPORT
            </Button>
          </Grid>
          <Typography variant="body1">{statusText}</Typography>
          {tableData && tableData.length > 0 && (
            <PreviewTable tableData={tableData} />
          )}
        </Stack>
      </form>
    </Application>
  );
};
