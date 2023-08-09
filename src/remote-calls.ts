/// <reference path="category_detection.ts" />

const PROP_BANK_ACCOUNTS = 'BANK_ACCOUNTS';
const PROP_AUTOMATIC_CATEGORIES_CONFIG = 'AUTOMATIC_CATEGORIZATION_CONFIG';

const cleanString = (str: string) => str?.replace(/\n/g, ' ').trim();

/**
 * This retrieves the bank accounts set by the user.
 * It uses 2 named ranges to combine them together as a usable object
 * @returns An object where the key is the label of the bank and the value the IBAN
 * @rpc_from dialogs/tabs/bank_accounts.html
 */
function getBankAccounts(): Record<string, string> {
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

/**
 * Retrieves strategy options
 * @returns The strategy options
 * @rpc_from dialogs/fileinput.script.html
 */
function getStrategyOptions(): typeof StrategyOption {
  return StrategyOption;
}

function getAutomaticCategorizationConfig(): Record<string, Array<RegExp>> {
  const config = PropertiesService.getDocumentProperties().getProperty(
    PROP_AUTOMATIC_CATEGORIES_CONFIG
  );

  try {
    return JSON.parse(config ?? '');
  } catch (ignore) {}

  return {};
}

function storeAutomaticCategorizationConfig(config: CategoryDetectionConfig) {
  Logger.log({
    type: typeof config,
    config,
  });

  PropertiesService.getDocumentProperties().setProperty(
    PROP_AUTOMATIC_CATEGORIES_CONFIG,
    JSON.stringify(config)
  );
}
