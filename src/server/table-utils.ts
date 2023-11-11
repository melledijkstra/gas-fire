import { ColumnRule, FireColumnRules, InputColumn, Table } from './types';
import { Utils } from './utils';

export const FireColumns = [
  'ref',
  'iban',
  'date',
  'amount',
  'balance',
  'contra_account',
  'description',
  'satisfaction',
  'icon',
  'category',
  'label',
  'hours',
  'contra_iban',
  'disabled',
  'currency',
];

export function buildColumn<T>(
  column: InputColumn,
  transformer: (value: string) => T
): (data: Table) => T[] {
  return (data: Table): T[] => {
    const rowCount = data.length;
    const columnTable = Utils.transpose(data); // try to transpose somewhere else
    if (columnTable[column] !== undefined) {
      return columnTable[column].map((val) => transformer(val));
    } else {
      return new Array(rowCount);
    }
  };
}

export function buildNewTableData(
  input: Table,
  columnImportRules: FireColumnRules
) {
  let output: Table = [];
  const rowCount = input.length;
  for (const columnName of FireColumns) {
    if (!(columnName in columnImportRules) || !columnImportRules[columnName]) {
      output.push(new Array(rowCount));
      continue;
    }
    const colRule = columnImportRules[columnName] as ColumnRule<unknown>;
    let column: any[];
    try {
      column = colRule(input);
      column = Utils.ensureLength(column, rowCount);
    } catch (e) {
      Logger.log(e);
      column = new Array(rowCount);
    }
    output.push(column);
  }
  output = Utils.transpose(output); // flip columns to rows
  return output;
}
