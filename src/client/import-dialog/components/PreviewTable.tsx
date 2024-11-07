import { Table } from '../../../common/types';
import { Stack, Typography } from '@mui/material';
import { Tabulator } from 'tabulator-tables';
import { useEffect, useRef } from 'react';
import 'tabulator-tables/dist/css/tabulator.min.css';

type ImportPreviewProps = {
  tableData: Table;
};

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

const DataTable = ({ table }: { table: Table }) => {
  const elemRef = useRef<HTMLDivElement>(null);

  let tabulator = null;

  useEffect(() => {
    // instantiate Tabulator when element is mounted
    if (elemRef.current) {
      tabulator = new Tabulator(elemRef.current, {
        data: [['data1', 'data2']],
        reactiveData: true, //enable data reactivity
        columns: [
          {
            title: 'col1',
          },
          {
            title: 'col2',
          },
        ],
      });
    }
  }, []);

  return <div id="tabulator" ref={elemRef} />;
};

export const PreviewTable = ({ tableData }: ImportPreviewProps) => {
  // const { rows, columns } = useMemo(() => prepareTableData(tableData), []);

  // const table = useMaterialReactTable({
  //   columns,
  //   data: rows,
  //   enableRowSelection: true,
  //   enableSelectAll: true,
  //   enableTopToolbar: false,
  //   enableBottomToolbar: false,
  //   enableColumnActions: false,
  //   enableColumnFilters: false,
  //   enablePagination: false,
  //   enableSorting: false,
  //   enableTableFooter: false,
  //   enableColumnResizing: true,
  //   defaultColumn: {
  //     minSize: 50,
  //     size: 100,
  //   },
  //   initialState: {
  //     density: 'compact',
  //   },
  // });

  const table = [[]];

  return (
    <Stack spacing={2}>
      <Typography component="h3">Preview data</Typography>
      {tableData && <DataTable table={table}></DataTable>}
    </Stack>
  );
};
