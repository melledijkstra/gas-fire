import { styled } from '@mui/material/styles';
import {
  Checkbox,
  Table as MuiTable,
  TableCell as MuiTableCell,
  TableRow as MuiTableRow,
  tableCellClasses,
} from '@mui/material';
import { CSSProperties } from 'react';

export const TableCheckbox = styled(Checkbox)({ padding: 0 });

export const Table = styled(MuiTable)({
  borderCollapse: 'collapse',
  minWidth: 650,
});

const commonCellStyles: CSSProperties = {
  fontSize: 12,
  textWrap: 'nowrap',
  padding: '5px 10px',
};

export const TableCell = styled(MuiTableCell)(
  ({ theme }) =>
    ({
      [`&.${tableCellClasses.head}`]: {
        ...commonCellStyles,
        backgroundColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
      },
      [`&.${tableCellClasses.body}`]: commonCellStyles,
    } as Record<string, CSSProperties>)
);

export const TableRow = styled(MuiTableRow)(({ theme }) => ({
  // hide last border
  '&:last-child td, &:last-child th': {
    border: 0,
  },
}));
