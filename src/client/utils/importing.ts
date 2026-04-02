import type { Table } from '@/common/types';
import { Logger } from '@/common/logger';
import { structuredClone } from '@/common/helpers';

export const acceptedMimeTypes = ['text/csv'];

export const isAllowedFile = (mimeType: string) => {
  if (!acceptedMimeTypes.includes(mimeType)) {
    return false;
  }
  return true;
};

export const csvToJson = (_csvData: Table): Record<string, string>[] => {
  const clonedTable = structuredClone(_csvData);
  const headers = clonedTable.shift();
  return clonedTable.map((row) => {
    const jsonRow: Record<string, string> = {};
    row.forEach((value, index) => {
      if (headers?.[index]) {
        jsonRow[String(headers[index])] = String(value);
      }
    });
    return jsonRow;
  });
};

export const excludeRowsFromData = (
  data: Table,
  rowsToExclude: Set<number>
): Table => {
  Logger.log('Excluding rows:', rowsToExclude);
  return data.filter((_, index) => !rowsToExclude.has(index));
};
