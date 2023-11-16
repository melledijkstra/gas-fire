export const fireColumns = [
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

export const SOURCE_SHEET_ID = 1093484485;
export const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
export const sheets = FireSpreadsheet.getSheets();

export function getSheetById(
  id: number
): GoogleAppsScript.Spreadsheet.Sheet | undefined {
  return sheets.find((sheet) => sheet.getSheetId() === id);
}

export const sourceSheet = getSheetById(SOURCE_SHEET_ID);
