import { FireSheet } from '../table'
import { FIRE_COLUMNS } from '@/common/constants'
import { Config, CATEGORIES_SHEET_NAME, CONFIG_SHEET_NAME } from '../config'
import { NAMED_RANGES, SOURCE_SHEET_NAME } from '../../common/constants'
import { Logger } from '@/common/logger'

export const mailNetWorth = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const locale = spreadsheet.getSpreadsheetLocale().replace('_', '-')
  const userEmail = spreadsheet.getOwner().getEmail()

  const netWorthRange = spreadsheet.getRangeByName(NAMED_RANGES.netWorth)

  if (!netWorthRange) {
    Logger.error('No net worth named range found, can\'t send email!')
    return
  }

  const netWorth = Number(netWorthRange.getValue())
  const currentMonth = new Date().toLocaleString(locale, { month: 'long' })

  const formattedNetWorth = netWorth.toLocaleString(locale, {
    style: 'currency',
    currency: 'EUR',
  })

  if (userEmail && !isNaN(netWorth)) {
    MailApp.sendEmail({
      to: userEmail,
      subject: `Your Net Worth (Monthly Update: ${currentMonth})`,
      htmlBody: `Your net worth is currently: <strong>${formattedNetWorth}</strong>`,
    })
  }
}

export const executeFindDuplicates = () => {
  const ui = SpreadsheetApp.getUi()
  try {
    const response = ui.prompt(
      `How many days should be considered for duplicates?`,
      `Please enter a full number of days (e.g. 7)`,
      ui.ButtonSet.OK_CANCEL,
    )

    if (response.getSelectedButton() !== ui.Button.OK) {
      return
    }

    const duplicateThresholdInDays = Number(response.getResponseText())
    const duplicateThresholdMs = duplicateThresholdInDays * 24 * 60 * 60 * 1000

    if (Number.isNaN(duplicateThresholdInDays)) {
      ui.alert('Invalid input! Please enter a valid number of days (e.g. 7)')
      return
    }

    const spreadSheet = SpreadsheetApp.getActiveSpreadsheet()
    const fireSheet = new FireSheet()

    const fireTable = fireSheet.getData()
    const headers = Array.from(FIRE_COLUMNS)

    const duplicateTable = fireTable.findDuplicates(duplicateThresholdMs)

    if (duplicateTable.isEmpty()) {
      ui.alert('No duplicates found!')
      return
    }

    const duplicateRows = duplicateTable.getData()

    const duplicateSheet
      = spreadSheet.getSheetByName('duplicate-rows')
        ?? spreadSheet.insertSheet('duplicate-rows')

    duplicateSheet.clear() // Clear any existing content

    // Copy headers
    duplicateSheet.getRange(1, 1, 1, headers.length).setValues([headers])

    // Copy duplicate rows
    duplicateSheet.getRange(2, 1, duplicateRows.length, duplicateRows[0].length).setValues(duplicateRows)

    ui.alert(
      `Found ${duplicateRows.length / 2} duplicates! Rows have been copied to the "duplicate-rows" sheet`,
    )
  }
  catch (error) {
    Logger.error(error)
    ui.alert(`An error occurred while finding duplicates: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export const debugImportSettings = () => {
  const accountConfigs = Config.getConfigurations()

  const ui = SpreadsheetApp.getUi()

  const configKeys = Object.keys(accountConfigs)

  ui.alert(`Found ${configKeys.length} account configurations!\n\n${configKeys.join('\n')}\n\nSee logs for more details`)

  Logger.log(accountConfigs)
}

export function GET_PROJECT_VERSION() {
  return __APP_VERSION__
}

export const validateSpreadsheetTemplate = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
  const ui = SpreadsheetApp.getUi()

  const requiredSheets = [SOURCE_SHEET_NAME, CATEGORIES_SHEET_NAME, CONFIG_SHEET_NAME]
  const missingSheets: string[] = []

  for (const sheetName of requiredSheets) {
    if (!spreadsheet.getSheetByName(sheetName)) {
      missingSheets.push(sheetName)
    }
  }

  const requiredNamedRanges = Object.values(NAMED_RANGES)
  const missingRanges: string[] = []

  for (const rangeName of requiredNamedRanges) {
    if (rangeName !== NAMED_RANGES.debug && !spreadsheet.getRangeByName(rangeName)) {
      missingRanges.push(rangeName)
    }
  }

  if (missingSheets.length > 0 || missingRanges.length > 0) {
    let message = 'Your spreadsheet is missing some required setup for the FIRE Add-on:\n\n'
    if (missingSheets.length > 0) {
      message += `Missing Sheets:\n- ${missingSheets.join('\n- ')}\n\n`
    }
    if (missingRanges.length > 0) {
      message += `Missing Named Ranges:\n- ${missingRanges.join('\n- ')}\n\n`
    }
    message += 'Please copy the official template to get started with the FIRE Add-on.'

    ui.alert('Setup Required', message, ui.ButtonSet.OK)
  }
  else {
    ui.alert('Setup Complete', 'Your spreadsheet is fully configured for the FIRE Add-on!', ui.ButtonSet.OK)
  }
}
