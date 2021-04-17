const ui = SpreadsheetApp.getUi();

function onOpen() {
  ui.createMenu('Import')
    .addItem('Upload CSV', 'fileUploadDialog')
    .addToUi();
}

function fileUploadDialog() {
  const html = HtmlService.createTemplateFromFile('fileinput.html')
    .evaluate()
    .setWidth(900)
    .setHeight(600);
  SpreadsheetApp.getUi()
    .showModalDialog(html, 'File upload dialog');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
