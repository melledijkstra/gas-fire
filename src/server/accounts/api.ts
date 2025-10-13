import { NAMED_RANGES } from '../../common/constants';
import { AccountUtils, isNumeric } from './account-utils';
import { FireSpreadsheet } from '../globals';
import type { StrategyOptions } from '@/common/types';

const cleanString = (str: string) => str?.replaceAll('\n', ' ').trim();

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
    .getRangeByName(NAMED_RANGES.accountNames)
    ?.getValues()
    .flat() as Array<string>;
  const ibans = sheet
    .getRangeByName(NAMED_RANGES.accounts)
    ?.getValues()
    .flat() as Array<string>;

  const bankAccounts: Record<string, string> = {};

  for (const [index, iban] of ibans?.entries() ?? []) {
    const label = cleanString(accountNames?.[index]);
    const cleanIban = cleanString(iban);

    if (cleanIban) {
      // this sets the label as the key and the iban as the value
      bankAccounts[label] = cleanIban;
    }
  }

  return bankAccounts;
}

export function calculateNewBalance(
  strategy: string,
  values: number[]
) {
  let balance = AccountUtils.getBalance(strategy);

  for (const amount of values) {
    balance += amount;
  }

  return balance;
}

/**
 * This function returns the strategy options available to the client side
 */
export function getStrategyOptions(): StrategyOptions {
  const accountNames = FireSpreadsheet.getRangeByName(NAMED_RANGES.accountNames);
  const accounts = accountNames
    .getValues()
    // make sure not to include empty rows
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    // flatten out the array so it is 1 dimensional with account names
    .flat();

  // we convert the account names to slugs and return them as an object
  const result = accounts.reduce<Record<string, string>>((obj: Record<string, string>, account: string) => {
    const slug = account.toLowerCase().replaceAll(' ', '_');
    obj[slug] = account;
    return obj;
  }, {});

  return result;
}
