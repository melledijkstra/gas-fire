import { useCallback } from 'react';
import { Table } from '@/common/types';
import { TableBody, TableContainer, TableHead, Paper } from '@mui/material';
import {
  Table as MuiTable,
  TableCell,
  TableRow,
  TableCheckbox,
} from './TableStyleOverrides';
import { useImportContext } from '../context/import-context';

export type TableOptions = {
  selectable: boolean;
};

const defaultOptions: TableOptions = {
  selectable: false,
};

export const DataTable = ({
  table,
  onRowToggled,
  options = defaultOptions,
}: {
  table: Table;
  onRowToggled?: (index: number, on: boolean) => void;
  options?: TableOptions;
}) => {
  const { selectable } = options;
  const { selectedRows, removeSelectedRow, addSelectedRow } =
    useImportContext();

  const headers = table?.[0];
  const rows = table?.slice(1);

  // Toggle row selection
  const handleRowSelect = useCallback(
    (index: number) => {
      if (selectedRows.has(index)) {
        removeSelectedRow(index);
      } else {
        addSelectedRow(index);
      }
    },
    [selectedRows]
  );

  // Determine if a row is selected
  const isRowSelected = (index: number) => selectedRows.has(index);

  return (
    <TableContainer component={Paper}>
      <MuiTable size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {selectable && <TableCell />} {/* <-- Checkbox column header */}
            {headers?.map((header, idx) => (
              <TableCell key={idx}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, rowIndex) => (
            <TableRow
              key={rowIndex}
              selected={selectable && isRowSelected(rowIndex + 1)}
            >
              {selectable && (
                <TableCell>
                  <TableCheckbox
                    size="small"
                    checked={isRowSelected(rowIndex + 1)} // +1 to account for header row
                    onChange={() => handleRowSelect(rowIndex + 1)} // +1 to account for header row
                  />
                </TableCell>
              )}
              {row.map((cell, cellIndex) => (
                <TableCell key={cellIndex}>{cell}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
};
