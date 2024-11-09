import { useEffect, useState } from 'react';
import { ServerResponse, StrategyOption, Table } from '@/common/types';
import {
  Button,
  FormControl,
  Grid,
  Icon,
  NativeSelect,
  Stack,
} from '@mui/material';
import { serverFunctions } from '@/client/utils/serverFunctions';
import {
  acceptedMimeTypes,
  excludeRowsFromData,
  isAllowedFile,
} from '../utils';
import Papa from 'papaparse';
import { useImportContext } from '../context/import-context';

export const ImportForm = () => {
  const [strategyOptions, setStrategyOptions] =
    useState<typeof StrategyOption>();
  const [importFile, setImportFile] = useState<File>();

  const {
    setStatusText,
    strategy,
    setStrategy,
    setImportData,
    importData,
    selectedRows,
  } = useImportContext();

  const onFailure = (error: ServerResponse) => alert(`Action failed! ${error}`);

  const submitDataToServer = (data: Table, importStrategy: StrategyOption) => {
    serverFunctions
      .processCSV(data, importStrategy)
      .then(() => google.script.host.close())
      .catch(onFailure);
  };

  const onParseError = (error: ServerResponse) => {
    console.error(error);
    alert(`Parsing error: ${error}`);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (
      !importData ||
      !importFile ||
      !isAllowedFile(importFile.type) ||
      !strategy
    ) {
      setStatusText(
        `No import file or import strategy selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
          ', '
        )})`
      );
      return;
    }

    const rowsToImport = excludeRowsFromData(importData, selectedRows);

    submitDataToServer(rowsToImport, strategy);
  };

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
    if (importFile) {
      Papa.parse<string[]>(importFile, {
        complete: (result) => setImportData(result.data),
        error: onParseError,
      });
    } else {
      setImportData();
    }
  }, [importFile]);

  const canSubmit = importFile && strategy;

  return (
    <form onSubmit={handleFormSubmit}>
      <Stack spacing={5}>
        <Grid container>
          <Grid item xs={6}>
            <Button
              component="label"
              variant="outlined"
              startIcon={<Icon>upload_file</Icon>}
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
                  setStrategy(event.target.value as StrategyOption);
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
      </Stack>
    </form>
  );
};
