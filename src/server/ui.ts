import { DIALOG_SIZES } from '@/common/constants';
import { executeAutomaticCategorization } from './remote-calls';

export function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('FIRE')
    .addItem('Upload Transactions', openFileUploadDialog.name)
    .addItem('Auto Categorize', executeAutomaticCategorization.name)
    .addItem('Config Validator', openConfigValidatorDialog.name)
    .addItem('About', openAboutDialog.name)
    .addToUi();
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

export function openConfigValidatorDialog(): void {
  const [width, height] = DIALOG_SIZES.configValidator;
  const html = HtmlService.createTemplateFromFile(
    'config-validator-dialog.html'
  )
    .evaluate()
    .setWidth(width)
    .setHeight(height);
  SpreadsheetApp.getUi().showModalDialog(html, 'Config Validator Dialog');
}
