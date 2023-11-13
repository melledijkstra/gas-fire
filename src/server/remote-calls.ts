import { Config } from './config';
import { buildNewTableData } from './table-utils';
import { ServerResponse, Strategy, StrategyOption, Table } from './types';
import { Utils, sourceSheet } from './utils';

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
 * This function returns the strategy options available to the client side
 */
export function getStrategyOptions(): typeof StrategyOption {
  return StrategyOption;
}

export function generatePreview(
  data: Table,
  strategy: StrategyOption
): { result: Table; newBalance: number } {
  return { result: data, newBalance: 1240.56 };
}
