// This is the main entry point of the application
// Only code that is imported here will be included in the build (if it is not imported otherwise)
// There are some function that are being ran by remote procedure calls (like the functions in this file)
// Make sure those files are included below independently
import {
  processCSV,
  generatePreview,
  getStrategyOptions,
} from './remote-calls';

function onOpen(): void {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Import')
    .addItem('Upload CSV', 'fileUploadDialog')
    .addItem('About', 'openAboutDialog')
    .addToUi();
}

function fileUploadDialog(): void {
  const html = HtmlService.createTemplateFromFile('src/dialogs/import.html')
    .evaluate()
    .setWidth(900)
    .setHeight(600);
  SpreadsheetApp.getUi().showModalDialog(html, 'File upload dialog');
}

function openAboutDialog(): void {
  const html = HtmlService.createTemplateFromFile('src/dialogs/about.html')
    .evaluate()
    .setWidth(300)
    .setHeight(200);
  SpreadsheetApp.getUi().showModalDialog(html, 'About');
}

function include(filename: string): string {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

const RPCs = [processCSV, generatePreview, getStrategyOptions];