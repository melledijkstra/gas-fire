export function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Import')
    .addItem('Upload CSV', 'fileUploadDialog')
    .addItem('Settings', 'openSettingsDialog')
    .addItem('About', 'openAboutDialog')
    .addToUi();
}

export function fileUploadDialog(): void {
  // Make sure that the file name here is correct with the output when generating the bundle!
  const html = HtmlService.createTemplateFromFile('import-dialog')
    .evaluate()
    .setWidth(900)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'File upload dialog');
}

export function openAboutDialog(): void {
  const html = HtmlService.createTemplateFromFile('about-dialog')
    .evaluate()
    .setWidth(300)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'About');
}

export function openSettingsDialog(): void {
  const html = HtmlService.createTemplateFromFile('settings-dialog.html')
    .evaluate()
    .setWidth(900)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'Settings Dialog');
}
