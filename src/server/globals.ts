import { IMPORT_RULES_SHEET_NAME, SOURCE_SHEET_NAME } from '@/common/constants'

// property key used to persist the spreadsheet ID for headless trigger contexts
export const PROP_SPREADSHEET_ID = 'FIRE_SPREADSHEET_ID'

let cachedSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | undefined

/**
 * Returns the FIRE spreadsheet.
 *
 * In an interactive session (menu action, dialog) `getActiveSpreadsheet()` is
 * always available and is used directly.
 *
 * In a headless context (time-based trigger such as the Enable Banking sync)
 * there is no active UI session, so we fall back to `openById()` using the ID
 * that was persisted to UserProperties the last time the user opened the sheet.
 *
 * @throws {Error} when no spreadsheet can be resolved (first-run before any
 *   `onOpen` has fired in a headless context).
 */
export const getFireSpreadsheet = (): GoogleAppsScript.Spreadsheet.Spreadsheet => {
  if (cachedSpreadsheet) return cachedSpreadsheet

  const active = SpreadsheetApp.getActiveSpreadsheet()
  if (active) {
    cachedSpreadsheet = active
    return cachedSpreadsheet
  }

  // headless context — fall back to the ID stored during the last onOpen
  const spreadsheetId = PropertiesService.getUserProperties().getProperty(PROP_SPREADSHEET_ID)
  if (!spreadsheetId) {
    throw new Error(
      'No active spreadsheet and no stored spreadsheet ID. '
      + 'Open the spreadsheet at least once so the FIRE add-on can register it.',
    )
  }
  cachedSpreadsheet = SpreadsheetApp.openById(spreadsheetId)
  return cachedSpreadsheet
}

let sourceSheet: GoogleAppsScript.Spreadsheet.Sheet | undefined

export const getSourceSheet = (): GoogleAppsScript.Spreadsheet.Sheet | undefined => {
  sourceSheet ??= getFireSpreadsheet().getSheetByName(SOURCE_SHEET_NAME) ?? undefined
  return sourceSheet
}

export const getImportRulesSheet = (): GoogleAppsScript.Spreadsheet.Sheet | undefined => {
  return getFireSpreadsheet().getSheetByName(IMPORT_RULES_SHEET_NAME) ?? undefined
}
