import { FireSpreadsheet } from '../globals';
import { NAMED_RANGES } from '@/common/constants';
import { getBankAccountOptionsCached } from '../accounts/rpc';
import { slugify } from '@/common/helpers';

const BANK_ACCOUNTS_CACHE_KEY = 'bank_accounts_ibans';

const CACHE_EXPIRATION_SECONDS = 10 * 60; // 10 minutes

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
    obj[id] = iban;
    return obj;
  }, {});
};

export const isNumeric = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value));
  }
  return false;
};

export class AccountUtils {
  private static cachedBankAccounts: Record<string, string> | null = null;

  static getBankAccounts(): Record<string, string> {
    if (this.cachedBankAccounts) {
      return this.cachedBankAccounts;
    }

    const cache = CacheService.getDocumentCache();
    const cachedData = cache?.get(BANK_ACCOUNTS_CACHE_KEY);
    if (cachedData) {
      try {
        this.cachedBankAccounts = JSON.parse(cachedData);
        return this.cachedBankAccounts!;
      } catch {
        // Fall back to live retrieval if parsing fails
      }
    }

    // this range contains the ibans only
    const ibans = FireSpreadsheet.getRangeByName(NAMED_RANGES.accounts);
    // we also need to include the labels
    const accounts = ibans
      ?.offset(0, -1, ibans.getLastRow(), 2)
      .getValues()
      // make sure not to include empty rows
      .filter((row) => row.some((cell: string) => cell !== '' && cell !== null));

    if (!accounts?.length) {
      return {}; // return empty list of bank accounts if none setup
    }

    // slugify the account ids to make sure they are all in the same format
    for (const account of accounts) {
      const [id] = account;
      const slugifiedId = slugify(id);
      account[0] = slugifiedId;
    }

    // convert the list to an object to easy work with it
    const result = listToObject(accounts);

    this.cachedBankAccounts = result;
    cache?.put(BANK_ACCOUNTS_CACHE_KEY, JSON.stringify(result), CACHE_EXPIRATION_SECONDS); // cache for 10 mins

    return result;
  }

  static getBankIban(bankId: string): string {
    const bankAccounts = AccountUtils.getBankAccounts();
    return bankAccounts?.[bankId] ?? '';
  }

  static getBalance(accountIdentifier: string): number {
    // this range contains the ibans only
    const ibans = FireSpreadsheet.getRangeByName(NAMED_RANGES.accounts);
    // we also need to include the labels and balances
    const accounts = ibans
      ?.offset(0, -1, ibans.getLastRow(), 3)
      .getValues()
      // make sure not to include empty rows
      .filter((row) => row.some((cell: string) => cell !== '' && cell !== null));

    if (!accounts?.length) {
      throw new Error('Could not retrieve balances of bank accounts');
    }

    const account = accounts.find((info) => {
      const accountId = slugify(info?.[0])
      return accountId === accountIdentifier;
    });

    if (!account) {
      throw new Error(`Account '${accountIdentifier}' not found`);
    }

    if (!account?.[2] || !isNumeric(account[2])) {
      // no balance found, or balance is not a number
      throw new Error(`Could not retrieve balance of ${accountIdentifier}`);
    }

    return parseFloat(account?.[2]); // balance is at the second index, retrieve it
  }

  static getAccountIdentifiers(): string[] {
    return Object.keys(getBankAccountOptionsCached());
  }

  static calculateNewBalance(bankAccount: string, values: number[]) {
    let balance = this.getBalance(bankAccount);
  
    for (const amount of values) {
      balance += amount;
    }
  
    return balance;
  }
}
