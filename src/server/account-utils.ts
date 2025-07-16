import { FireSpreadsheet } from './globals';
import { NAMED_RANGES } from '@/common/constants';

/**
 * Converts a list to an object
 * Example:
 * ```
 * input: [
 *  ['aaa', '111'],
 *  ['bbb', '222']
 * ]
 * output: {
 *  'aaa': '111',
 *  'bbb': '222'
 * }
 * ```
 * @param list
 * @returns
 */
const listToObject = (list: string[][]): Record<string, string> => {
  return list.reduce<Record<string, string>>((obj, account) => {
    const [id, iban] = account;
    obj[typeof id === 'string' ? id.toUpperCase() : id] = iban;
    return obj;
  }, {});
};

export const isNumeric = (value: unknown): boolean => {
  return !isNaN(value as number);
};

export class AccountUtils {
  static getBankAccounts(): Record<string, string> {
    // this range contains the ibans only
    const ibans = FireSpreadsheet.getRangeByName(NAMED_RANGES.accounts);
    // we also need to include the labels
    const accounts = ibans
      ?.offset(0, -1, ibans.getLastRow(), 2)
      .getValues()
      // make sure not to include empty rows
      .filter((row) => row.some((cell) => cell !== '' && cell !== null));

    if (!accounts?.length) {
      return {}; // return empty list of bank accounts if none setup
    }

    // convert the list to an object to easy work with it
    return listToObject(accounts);
  }

  static getBankIban(bank: string): string {
    const bankAccounts = AccountUtils.getBankAccounts();
    return bankAccounts?.[bank] ?? '';
  }

  static getBalance(strategy: string): number {
    // this range contains the ibans only
    const ibans = FireSpreadsheet.getRangeByName(NAMED_RANGES.accounts);
    // we also need to include the labels and balances
    const accounts = ibans
      ?.offset(0, -1, ibans.getLastRow(), 3)
      .getValues()
      // make sure not to include empty rows
      .filter((row) => row.some((cell) => cell !== '' && cell !== null));

    if (!accounts?.length) {
      throw new Error('Could not retrieve balances of bank accounts');
    }

    const account = accounts.find((info) => {
      return info[0].toUpperCase() === strategy.toUpperCase();
    });

    if (!account || !account?.[2] || !isNumeric(account[2])) {
      // no account found, no balance found, or balance is not a number
      throw new Error(`Could not retrieve balance of ${strategy}`);
    }

    const balance = parseFloat(account[2]);
    if (isNaN(balance)) {
      throw new Error(`Invalid balance value for ${strategy}: ${account[2]}`);
    }

    return balance;
  }
}
