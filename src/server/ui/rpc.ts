import { NAMED_RANGES } from '@/common/constants'
import { DIALOG_SIZES } from '@/common/settings'
import { executeAutomaticCategorization } from '../category-detection/rpc'
import { debugImportSettings, executeFindDuplicates, validateSpreadsheetTemplate } from '../other/rpc'

export function onInstall(e: GoogleAppsScript.Events.AddonOnInstall): void {
  onOpen(e)
}

export function onOpen(e?: GoogleAppsScript.Events.SheetsOnOpen | GoogleAppsScript.Events.AddonOnInstall): void {
  const ui = SpreadsheetApp.getUi()
  const menu = ui.createAddonMenu()
    .addItem('Upload Transactions (CSV)', openFileUploadDialog.name)
    .addItem('Auto Categorize', executeAutomaticCategorization.name)
    .addItem('Find duplicates', executeFindDuplicates.name)
    .addItem('Initialize / Check Setup', validateSpreadsheetTemplate.name)
    .addItem('About', openAboutDialog.name)

  if (e && e.authMode !== ScriptApp.AuthMode.NONE) {
    const isDebugEnabled: boolean = SpreadsheetApp.getActiveSpreadsheet().getRangeByName(NAMED_RANGES.debug)?.getValue() ?? false
    if (isDebugEnabled) {
      const debugMenu = ui.createMenu('Debug')
      debugMenu.addItem('Debug Import Settings', debugImportSettings.name)
      menu.addSubMenu(debugMenu)
    }
  }

  menu.addToUi()
}

export function openFileUploadDialog(): void {
  const [width, height] = DIALOG_SIZES.import
  // Make sure that the file name here is correct with the output when generating the bundle!
  const html = HtmlService.createTemplateFromFile('import-dialog')
    .evaluate()
    .setWidth(width)
    .setHeight(height)
  SpreadsheetApp.getUi().showModalDialog(html, 'File upload dialog')
}

export function openAboutDialog(): void {
  const [width, height] = DIALOG_SIZES.about
  const html = HtmlService.createTemplateFromFile('about-dialog')
    .evaluate()
    .setWidth(width)
    .setHeight(height)
  SpreadsheetApp.getUi().showModalDialog(html, 'About')
}

export function openSettingsDialog(): void {
  const [width, height] = DIALOG_SIZES.settings
  const html = HtmlService.createTemplateFromFile('settings-dialog.html')
    .evaluate()
    .setWidth(width)
    .setHeight(height)
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings Dialog')
}
