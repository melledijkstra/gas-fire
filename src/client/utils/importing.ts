import type { Table } from '@/common/types';
import { Logger } from '@/common/logger';

export const acceptedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];

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
        jsonRow[headers[index]] = value;
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
