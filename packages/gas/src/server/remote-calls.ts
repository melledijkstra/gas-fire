import { sourceSheet } from './globals';
import { Config } from './config';
import { TableUtils, processTableWithImportRules } from './table-utils';
import { n26Cols, openbankCols, raboCols } from './types';
import { ServerResponse, StrategyOption, Table } from '../common/types';
import { AccountUtils, isNumeric } from './account-utils';
import { Transformers } from './transformers';

const cleanString = (str: string) => str?.replace(/\n/g, ' ').trim();

/**
 * This retrieves the bank accounts set by the user.
 * It uses 2 named ranges to combine them together as a usable object
 * @returns An object where the key is the label of the bank and the value the IBAN
 * @rpc_from dialogs/tabs/bank_accounts.html
 */
export function getBankAccounts(): Record<string, string> {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  // retrieve account names and ibans
  // the ranges should only have one column so we use .flat()
  const accountNames = sheet
    .getRangeByName('accountNames')
    ?.getValues()
    .flat() as Array<string>;
  const ibans = sheet
    .getRangeByName('accounts')
    ?.getValues()
    .flat() as Array<string>;

  const bankAccounts: Record<string, string> = {};

  ibans?.forEach((iban, index) => {
    const label = cleanString(accountNames?.[index]);
    const cleanIban = cleanString(iban);

    if (cleanIban) {
      // this sets the label as the key and the iban as the value
      bankAccounts[label] = cleanIban;
    }
  });

  return bankAccounts;
}

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

export function calculateNewBalance(
  strategy: StrategyOption,
  values: number[]
) {
  let balance = AccountUtils.getBalance(strategy);

  for (const amount of values) {
    balance += amount;
  }

  return balance;
}

export function generatePreview(
  table: Table,
  strategy: StrategyOption
): {
  result: Table;
  newBalance?: number;
} {
  // perform before import rules and return the data for preview

  const config = Config.getConfig();

  let amounts = [];
  let decimalSeparator = '.';
  switch (strategy) {
    case StrategyOption.N26:
      decimalSeparator = config.n26.decimalSeparator;
      amounts = TableUtils.retrieveColumn(table, n26Cols.Amount);
      break;
    case StrategyOption.OPENBANK:
      amounts = TableUtils.retrieveColumn(table, openbankCols.Importe);
      break;
    case StrategyOption.RABO:
      amounts = TableUtils.retrieveColumn(table, raboCols.Bedrag);
      break;
  }

  const amountNumbers = amounts
    .map((value) => Transformers.transformMoney(value, '.'))
    .filter(isNumeric);

  const newBalance = calculateNewBalance(strategy, amountNumbers);

  return { result: table, newBalance };
}

/**
 * This function returns the strategy options available to the client side
 */
export function getStrategyOptions(): typeof StrategyOption {
  return StrategyOption;
}
