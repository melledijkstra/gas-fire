import { NAMED_RANGES } from '@/common/constants'
import { DIALOG_SIZES, FEATURES } from '@/common/settings'
import { debugImportSettings, executeFindDuplicates } from '../other/rpc'

function showModalDialog(templateFile: string, size: [number, number], title: string): void {
  const [width, height] = size
  // Make sure that the file name here matches the output when generating the bundle!
  const html = HtmlService.createTemplateFromFile(templateFile)
    .evaluate()
    .setWidth(width)
    .setHeight(height)
  SpreadsheetApp.getUi().showModalDialog(html, title)
}

export function onOpen(): void {
  const isDebugEnabled: boolean = SpreadsheetApp.getActiveSpreadsheet().getRangeByName(NAMED_RANGES.debug)?.getValue() ?? false
  const ui = SpreadsheetApp.getUi()
  const menu = ui.createMenu('YMYL')
    .addItem('Upload Transactions (CSV)', openFileUploadDialog.name)
    .addItem('Find duplicates', executeFindDuplicates.name)

  if (FEATURES.ENABLE_BANKING_ENABLED) {
    menu.addItem('Enable Banking (Beta)', openEnableBankingDialog.name)
  }

  menu.addItem('Mobile Budget App', openMobileBudgetDialog.name)
  menu.addItem('About', openAboutDialog.name)

  if (isDebugEnabled) {
    const debugMenu = ui.createMenu('Debug')
    debugMenu.addItem('Debug Import Settings', debugImportSettings.name)
    menu.addSubMenu(debugMenu)
  }

  menu.addToUi()
}

export function doGet(): GoogleAppsScript.HTML.HtmlOutput {
  return HtmlService.createTemplateFromFile('mobile-budget-dialog')
    .evaluate()
    .setTitle('YMYL Mobile Budget')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
}

export function openFileUploadDialog(): void {
  showModalDialog('import-dialog', DIALOG_SIZES.import, 'File upload dialog')
}

export function openAboutDialog(): void {
  showModalDialog('about-dialog', DIALOG_SIZES.about, 'About')
}

export function openSettingsDialog(): void {
  showModalDialog('settings-dialog', DIALOG_SIZES.settings, 'Settings Dialog')
}

export function openEnableBankingDialog(): void {
  showModalDialog('enable-banking-dialog', DIALOG_SIZES.enableBanking, 'Enable Banking (Beta)')
}

export function openMobileBudgetDialog(): void {
  showModalDialog('mobile-budget-dialog', DIALOG_SIZES.mobileBudget, 'Mobile Budget App')
}
