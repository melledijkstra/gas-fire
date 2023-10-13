/**
 * This function gets called by client side script
 * @see file-input.html
 */
function processCSV(
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
function getStrategyOptions(): typeof StrategyOption {
  return StrategyOption;
}

function generatePreview(
  data: Table,
  strategy: Strategy
): { result: Table; newBalance: number } {
  return { result: data, newBalance: 1240.56 };
}
