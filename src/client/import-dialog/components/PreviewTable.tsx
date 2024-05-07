import { Table } from '../../../common/types';
import { Stack, Typography } from '@mui/material';
import {
  MaterialReactTable,
  useMaterialReactTable,
  type MRT_ColumnDef,
  MRT_RowData,
} from 'material-react-table';
import { useMemo } from 'react';

type ImportPreviewProps = {
  tableData: Table;
};

const prepareTableColumn = (
  field: string,
  columnName?: string
): MRT_ColumnDef<Record<string, unknown>> => ({
  accessorKey: field,
  header: columnName ?? field,
});

const prepareTableData = (
  inputTable: Table
): {
  columns: MRT_ColumnDef<Record<string, unknown>>[];
  rows: MRT_RowData[];
} => {
  const table = structuredClone(inputTable);
  const headingRow = table?.shift();

  if (!headingRow) {
    throw Error('The data does not contain a heading row');
  }

  const columns = headingRow.map((heading, index) =>
    prepareTableColumn(`col${index}`, heading)
  );

  const rows = table.map((row, index) => {
    const dataGridRow: Record<string, unknown> = { id: index };
    // fill the fields in the data grid table
    row.forEach((cellValue, colIndex) => {
      dataGridRow[`col${colIndex}`] = cellValue;
    });
    return dataGridRow;
  });

  return { columns, rows };
};

export const PreviewTable = ({ tableData }: ImportPreviewProps) => {
  const { rows, columns } = useMemo(() => prepareTableData(tableData), []);

  const table = useMaterialReactTable({
    columns,
    data: rows,
    enableRowSelection: true,
    enableSelectAll: true,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    enableColumnActions: false,
    enableColumnFilters: false,
    enablePagination: false,
    enableSorting: false,
    enableTableFooter: false,
    enableColumnResizing: true,
    defaultColumn: {
      minSize: 50,
      size: 100,
    },
    initialState: {
      density: 'compact',
    },
  });

  return (
    <Stack spacing={2}>
      <Typography component="h3">Preview data</Typography>
      {tableData && <MaterialReactTable table={table}></MaterialReactTable>}
    </Stack>
  );
};
