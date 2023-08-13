import { Config } from './config';
import { buildNewTableData } from './table-utils';
import { ServerResponse, Strategy, StrategyOption, Table } from './types';
import { Utils } from './utils';

const SOURCE_SHEET_ID = 1093484485;

const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
const sheets = FireSpreadsheet.getSheets();

function getSheetById(
  id: number
): GoogleAppsScript.Spreadsheet.Sheet | undefined {
  return sheets.find((sheet) => sheet.getSheetId() === id);
}

const sourceSheet = getSheetById(SOURCE_SHEET_ID);

/**
 * This function gets called by client side script
 * @see file-input.html
 */
export function processCSV(
  input: Table,
  importStrategy: StrategyOption
): ServerResponse {
  const strategies = Config.getConfig();
  sourceSheet?.activate();
  sourceSheet?.showSheet();
  if (!(importStrategy in strategies)) {
    throw new Error(`Import strategy ${importStrategy} is not defined!`);
  }

  const { beforeImport, columnImportRules, afterImport } =
    strategies[importStrategy];

  if (beforeImport) {
    for (const rule of beforeImport) {
      input = rule(input);
    }
  }

  let output = buildNewTableData(input, columnImportRules);
  Utils.importData(output);

  if (afterImport) {
    for (const rule of afterImport) {
      rule(output);
    }
  }

  const msg = `imported ${output.length} rows!`;

  return {
    message: msg,
  };
}

/**
 * Remote Procedure Call
 * This function returns the strategy options available to the client side
 * @returns {StrategyOption}
 */
export function getStrategyOptions(): typeof StrategyOption {
  return StrategyOption;
}

export function generatePreview(
  data: Table,
  strategy: Strategy
): { result: Table; newBalance: number } {
  return { result: data, newBalance: 1240.56 };
}
