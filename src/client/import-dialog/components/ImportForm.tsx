import { useEffect, useState } from 'react';
import { ServerResponse, Table } from '@/common/types';
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

const onFailure = (error: ServerResponse) => alert(`Action failed! ${error}`);

export const ImportForm = () => {
  const [importFile, setImportFile] = useState<File>();

  const {
    accountOptions,
    setStatusText,
    selectedAccount,
    setSelectedAccount,
    setImportData,
    importData,
    selectedRows,
  } = useImportContext();

  const submitDataToServer = (data: Table, bankAccount: string) => {
    serverFunctions
      .processCSV(data, bankAccount)
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
      !selectedAccount
    ) {
      setStatusText(
        `No import file or bank account selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
          ', '
        )})`
      );
      return;
    }

    const rowsToImport = excludeRowsFromData(importData, selectedRows);

    submitDataToServer(rowsToImport, selectedAccount);
  };

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

  const canSubmit = importFile && selectedAccount;

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
                id="import-bank-account"
                inputProps={{
                  id: 'import-bank-account',
                }}
                onChange={(event) => {
                  setSelectedAccount(event.target.value);
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose Bank
                </option>
                {accountOptions
                  ? Object.keys(accountOptions).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))
                  : null}
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
