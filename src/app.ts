const ui = SpreadsheetApp.getUi()

function onOpen(): void {
  ui.createMenu('Import')
    .addItem('Upload CSV', 'fileUploadDialog')
    .addToUi()
}

function fileUploadDialog(): void {
  const html = HtmlService.createTemplateFromFile('fileinput.html')
    .evaluate()
    .setWidth(900)
    .setHeight(600)
  SpreadsheetApp.getUi()
    .showModalDialog(html, 'File upload dialog');
}

function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent()
}
