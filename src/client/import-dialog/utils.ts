import { Table } from '../../common/types';

export const acceptedMimeTypes = ['text/csv', 'application/vnd.ms-excel'];

export const isAllowedFile = (mimeType: string) => {
  if (!acceptedMimeTypes.includes(mimeType)) {
    alert(`Please upload a CSV file, "${mimeType}" is not accepted!`);
    return false;
  }
  return true;
};

export const csvToJson = (csvData: Table): Record<string, string>[] => {
  const headers = csvData.shift();
  return csvData.map((row) => {
    let jsonRow: Record<string, string> = {};
    row.forEach((value, index) => {
      if (headers?.[index]) {
        jsonRow[headers[index]] = value;
      }
    });
    return jsonRow;
  });
};
