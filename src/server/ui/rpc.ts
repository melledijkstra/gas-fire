import { NAMED_RANGES } from '@/common/constants'
import { DIALOG_SIZES, FEATURES } from '@/common/settings'
import { executeAutomaticCategorization } from '../category-detection/rpc'
import { debugImportSettings, executeFindDuplicates } from '../other/rpc'

export function onOpen(): void {
  const isDebugEnabled: boolean = SpreadsheetApp.getActiveSpreadsheet().getRangeByName(NAMED_RANGES.debug)?.getValue() ?? false
  const ui = SpreadsheetApp.getUi()
  const menu = ui.createMenu('FIRE')
    .addItem('Upload Transactions (CSV)', openFileUploadDialog.name)
    .addItem('Auto Categorize', executeAutomaticCategorization.name)
    .addItem('Find duplicates', executeFindDuplicates.name)

  if (FEATURES.ENABLE_BANKING_ENABLED) {
    menu.addItem('Enable Banking Integration', openEnableBankingDialog.name)
  }

  menu.addItem('About', openAboutDialog.name)

  if (isDebugEnabled) {
    const debugMenu = ui.createMenu('Debug')
    debugMenu.addItem('Debug Import Settings', debugImportSettings.name)
    menu.addSubMenu(debugMenu)
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
  const html = HtmlService.createTemplateFromFile('settings-dialog')
    .evaluate()
    .setWidth(width)
    .setHeight(height)
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings Dialog')
}

export function openEnableBankingDialog(): void {
  const [width, height] = DIALOG_SIZES.enableBanking
  const html = HtmlService.createTemplateFromFile('enable-banking-dialog')
    .evaluate()
    .setWidth(width)
    .setHeight(height)
  SpreadsheetApp.getUi().showModalDialog(html, 'Enable Banking Integration')
}
