import { Table } from '../../../common/types';
import { Stack, Typography } from '@mui/material';
import { DataGrid, GridColDef, GridRowsProp } from '@mui/x-data-grid';

type ImportPreviewProps = {
  tableData?: Table;
};

const toDataGridColumn = (field: string, columnName?: string): GridColDef => ({
  field: field,
  headerName: columnName ?? field,
  disableColumnMenu: true,
  disableReorder: true,
  sortable: false,
  flex: 1,
});

const prepareTableData = (
  inputTable: Table
): { columns: GridColDef[]; rows: GridRowsProp } => {
  const table = structuredClone(inputTable);
  const headingRow = table?.shift();

  if (!headingRow) {
    throw Error('The data does not contain a heading row');
  }

  const dataGridColumns: GridColDef[] = headingRow.map((heading, index) =>
    toDataGridColumn(`col${index}`, heading)
  );

  const dataGridRows = table.map((row, index) => {
    const dataGridRow: Record<string, unknown> = { id: index };
    // fill the fields in the data grid table
    row.forEach((cellValue, index) => {
      dataGridRow[`col${index}`] = cellValue;
    });
    return dataGridRow;
  });

  return {
    columns: dataGridColumns,
    rows: dataGridRows,
  };
};

export const PreviewTable = ({ tableData }: ImportPreviewProps) => {
  if (!tableData || tableData.length < 1) return null;

  const preparedTableData = prepareTableData(tableData);

  return (
    <Stack spacing={2}>
      <Typography component="h3">Preview data</Typography>
      {tableData && (
        <DataGrid
          rowHeight={35}
          columnHeaderHeight={35}
          {...preparedTableData}
          hideFooter
        ></DataGrid>
      )}
    </Stack>
  );
};
