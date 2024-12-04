import type { Table } from '@/common/types';
import { useState } from 'react';
import { useImportContext } from '../context/import-context';
import { serverFunctions } from '@/client/utils/serverFunctions';
import { DataTable } from './DataTable';
import { Button } from '@mui/material';
import { excludeRowsFromData } from '../utils';

const getBrowserLocale = () => {
  if (navigator.languages != undefined) return navigator.languages[0];
  return navigator.language;
};

export const PreviewTable = () => {
  const { setStatusText, importData, selectedBank, selectedRows } =
    useImportContext();
  const [previewData, setPreviewData] = useState<Table>();

  const canGeneratePreview = importData && selectedBank;

  const onGeneratePreviewSuccess = ({
    result,
    newBalance,
  }: {
    result: Table;
    newBalance?: number;
  }) => {
    const locale = getBrowserLocale();
    const newBalanceFormatted = newBalance?.toLocaleString(locale, {
      style: 'currency',
      currency: 'EUR',
    });
    setStatusText(
      `Import preview set${
        newBalanceFormatted ? ` - new balance: ${newBalanceFormatted}` : ''
      }`
    );
    setPreviewData(result);
  };

  const generatePreview = () => {
    if (canGeneratePreview) {
      const dataToProcess = excludeRowsFromData(importData, selectedRows);
      setStatusText('Data is being processed...');
      serverFunctions
        .generatePreview(dataToProcess, selectedBank)
        .then(onGeneratePreviewSuccess)
        .catch((error) => setStatusText(`Failed to create preview: ${error}`));
    }
  };

  return (
    <>
      {previewData && <DataTable table={previewData} />}
      <Button
        sx={{ marginTop: previewData ? 2 : 0 }}
        disabled={!canGeneratePreview}
        variant="contained"
        color="primary"
        onClick={generatePreview}
      >
        Generate Preview
      </Button>
    </>
  );
};
