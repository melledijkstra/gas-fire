function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Import')
    .addItem('Upload CSV', 'fileUploadDialog')
    .addItem('About', 'openAboutDialog')
    .addToUi();
}

function fileUploadDialog(): void {
  const html = HtmlService.createTemplateFromFile(
    'client/src/dialogs/import.html'
  )
    .evaluate()
    .setWidth(900)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'File upload dialog');
}

function openAboutDialog(): void {
  const html = HtmlService.createTemplateFromFile(
    'client/src/dialogs/about.html'
  )
    .evaluate()
    .setWidth(300)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'About');
}

function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
