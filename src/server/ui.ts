import { DIALOG_SIZES } from '@/common/constants';
import { debugImportSettings, executeAutomaticCategorization, executeFindDuplicates } from './remote-calls';

export function onOpen(): void {
  const isDebugEnabled: boolean = SpreadsheetApp.getActiveSpreadsheet().getRangeByName('DEBUG').getValue() ?? false;
  const ui = SpreadsheetApp.getUi();
  const menu = ui.createMenu('FIRE')
    .addItem('Upload Transactions (CSV)', openFileUploadDialog.name)
    .addItem('Auto Categorize', executeAutomaticCategorization.name)
    .addItem('Find duplicates', executeFindDuplicates.name)
    .addItem('About', openAboutDialog.name);

  if (isDebugEnabled) {
    const debugMenu = ui.createMenu('Debug');
    debugMenu.addItem('Debug Import Settings', debugImportSettings.name);
    menu.addSubMenu(debugMenu);
  }

  menu.addToUi();
}

export function openFileUploadDialog(): void {
  const [width, height] = DIALOG_SIZES.import;
  // Make sure that the file name here is correct with the output when generating the bundle!
  const html = HtmlService.createTemplateFromFile('import-dialog')
    .evaluate()
    .setWidth(width)
    .setHeight(height);
  SpreadsheetApp.getUi().showModalDialog(html, 'File upload dialog');
}

export function openAboutDialog(): void {
  const [width, height] = DIALOG_SIZES.about;
  const html = HtmlService.createTemplateFromFile('about-dialog')
    .evaluate()
    .setWidth(width)
    .setHeight(height);
  SpreadsheetApp.getUi().showModalDialog(html, 'About');
}

export function openSettingsDialog(): void {
  const [width, height] = DIALOG_SIZES.settings;
  const html = HtmlService.createTemplateFromFile('settings-dialog.html')
    .evaluate()
    .setWidth(width)
    .setHeight(height);
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings Dialog');
}
