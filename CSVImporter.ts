const ui = SpreadsheetApp.getUi();

function onOpen() {
  ui.createMenu('Import')
    .addItem('Upload CSV', 'fileUploadDialog')
    .addToUi();
}

function fileUploadDialog() {
  const html = HtmlService.createTemplateFromFile('fileinput.html')
    .evaluate()
    .setWidth(500)
    .setHeight(500);
  SpreadsheetApp.getUi()
    .showModalDialog(html, 'File upload dialog');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * This function gets called by client side script @see ./file-input.html
 */
function processCSV(result) {
  Logger.log('processCSV');
  const rowCount = result.data.length;
  Logger.log(result.data);
  for (let i = 0; i < rowCount; i++) {
    if (i === (rowCount - 1)) continue; // skip last row that is always empty
    const row = result.data[i];
    Logger.log(row);
  }
  //SpreadsheetApp.getActiveSheet().appendRow(jsonData);
}
