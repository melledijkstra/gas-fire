import { DIALOG_SIZES } from '../common/constants';

export function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Import')
    .addItem('Upload CSV', 'fileUploadDialog')
    .addItem('Settings', 'openSettingsDialog')
    .addItem('About', 'openAboutDialog')
    .addToUi();
}

export function fileUploadDialog(): void {
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
