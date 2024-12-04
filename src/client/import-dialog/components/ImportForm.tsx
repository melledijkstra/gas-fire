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

export const ImportForm = () => {
  const [bankOptions, setBankOptions] = useState<Record<string, string>>({});
  const [importFile, setImportFile] = useState<File>();

  const {
    setStatusText,
    selectedBank,
    setSelectedBank,
    setImportData,
    importData,
    selectedRows,
  } = useImportContext();

  const onFailure = (error: ServerResponse) => alert(`Action failed! ${error}`);

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
      !selectedBank
    ) {
      setStatusText(
        `No import file or bank account selected, or you selected a file type that is not supported (only: ${acceptedMimeTypes.join(
          ', '
        )})`
      );
      return;
    }

    const rowsToImport = excludeRowsFromData(importData, selectedRows);

    submitDataToServer(rowsToImport, selectedBank);
  };

  useEffect(() => {
    // retrieve possible bank options when mounted
    serverFunctions
      .getAccountOptions()
      .then((accounts) => {
        setBankOptions(accounts);
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

  const canSubmit = importFile && selectedBank;

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
                  setSelectedBank(event.target.value);
                }}
                defaultValue=""
              >
                <option value="" disabled>
                  Choose Bank
                </option>
                {bankOptions
                  ? Object.keys(bankOptions).map((key) => (
                      <option key={key} value={bankOptions[key]}>
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
