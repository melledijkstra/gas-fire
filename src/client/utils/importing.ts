import type { RawTable } from '@/common/types';
import { Logger } from '@/common/logger';
import { structuredClone } from '@/common/helpers';

export const acceptedMimeTypes = ['text/csv'];

export const isAllowedFile = (mimeType: string) => {
  if (!acceptedMimeTypes.includes(mimeType)) {
    return false;
  }
  return true;
};

export const csvToJson = (_csvData: RawTable): Record<string, string>[] => {
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
  data: RawTable,
  rowsToExclude: Set<number>
): RawTable => {
  Logger.log('Excluding rows:', rowsToExclude);
  return data.filter((_, index) => !rowsToExclude.has(index));
};
