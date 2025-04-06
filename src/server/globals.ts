import { SOURCE_SHEET_ID } from '@/common/constants';

export const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
const sheets = FireSpreadsheet.getSheets();

export function getSheetById(id: number) {
  return sheets.find((sheet) => sheet.getSheetId() === id);
}

export const sourceSheet = getSheetById(SOURCE_SHEET_ID);
