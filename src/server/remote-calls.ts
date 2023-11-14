import { sourceSheet } from './globals';
import { Config } from './config';
import { TableUtils, processTableWithImportRules } from './table-utils';
import { ServerResponse, StrategyOption, Table } from './types';

export function processCSV(
  inputTable: Table,
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
      inputTable = rule(inputTable);
    }
  }

  let output = processTableWithImportRules(inputTable, columnImportRules);
  TableUtils.importData(output);

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
 * This function returns the strategy options available to the client side
 */
export function getStrategyOptions(): typeof StrategyOption {
  return StrategyOption;
}
