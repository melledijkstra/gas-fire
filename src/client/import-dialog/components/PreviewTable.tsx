import { JsonTable } from '../../../server/types';
import { Stack, Typography } from '@mui/material';

type ImportPreviewProps = {
  tableData?: JsonTable;
};

export const PreviewTable = ({ tableData }: ImportPreviewProps) => {
  return (
    <Stack spacing={2}>
      <Typography component="h3">Preview data</Typography>
    </Stack>
  );
};
