import { SOURCE_SHEET_NAME } from '@/common/constants'
export const getFireSpreadsheet = () => SpreadsheetApp.getActiveSpreadsheet()

let sourceSheet: GoogleAppsScript.Spreadsheet.Sheet | undefined

export const getSourceSheet = (): GoogleAppsScript.Spreadsheet.Sheet | undefined => {
  sourceSheet ??= getFireSpreadsheet().getSheetByName(SOURCE_SHEET_NAME) ?? undefined
  return sourceSheet
}
