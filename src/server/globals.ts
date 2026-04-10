import { IMPORT_RULES_SHEET_NAME, SOURCE_SHEET_NAME } from '@/common/constants'

let cachedSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | undefined

export const getFireSpreadsheet = () => (
  cachedSpreadsheet ??= SpreadsheetApp.getActiveSpreadsheet()
)

let sourceSheet: GoogleAppsScript.Spreadsheet.Sheet | undefined

export const getSourceSheet = (): GoogleAppsScript.Spreadsheet.Sheet | undefined => {
  sourceSheet ??= getFireSpreadsheet().getSheetByName(SOURCE_SHEET_NAME) ?? undefined
  return sourceSheet
}

export const getImportRulesSheet = (): GoogleAppsScript.Spreadsheet.Sheet | undefined => {
  return getFireSpreadsheet().getSheetByName(IMPORT_RULES_SHEET_NAME) ?? undefined
}
