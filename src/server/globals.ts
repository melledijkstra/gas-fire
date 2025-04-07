import { SOURCE_SHEET_ID } from '@/common/constants';

export const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
export const sheets = FireSpreadsheet.getSheets();

export function getSheetById(id: number) {
  return sheets.find((sheet) => sheet.getSheetId() === id);
}

let sourceSheet: GoogleAppsScript.Spreadsheet.Sheet | undefined

export const getSourceSheet = () => {
  sourceSheet ??= sheets.find((sheet) => sheet.getSheetId() === SOURCE_SHEET_ID)
  return sourceSheet
}
