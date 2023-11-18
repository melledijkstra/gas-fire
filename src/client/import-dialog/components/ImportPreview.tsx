import { useEffect, useRef } from 'react';
import Tabulator from 'tabulator-tables';
import { JsonTable } from '../../../server/types';
import { Stack, Typography } from '@mui/material';

type ImportPreviewProps = {
  tableData?: JsonTable;
};

export const ImportPreview = ({ tableData }: ImportPreviewProps) => {
  const tabulatorRef = useRef<Tabulator>();
  const tabulatorContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tabulatorRef.current) {
      tabulatorRef.current.setData(tableData);
    }
  }, [tableData]);

  useEffect(() => {
    if (!tabulatorContainer.current) {
      return;
    }
    tabulatorRef.current = new Tabulator(tabulatorContainer.current, {
      autoColumns: true,
      data: tableData,
      layout: 'fitColumns',
      autoColumnsDefinitions: (definitions) => {
        definitions?.forEach(
          (definition) => (definition['headerSort'] = false)
        );
        return definitions ?? [];
      },
    });
  }, [tabulatorContainer.current]);

  return (
    <Stack spacing={2}>
      <Typography component="h3">Preview data</Typography>
      <div ref={tabulatorContainer}></div>
    </Stack>
  );
};
