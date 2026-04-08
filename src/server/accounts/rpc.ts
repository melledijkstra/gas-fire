import { FireSpreadsheet } from '../globals';
import type { BankOptions, ServerResponse } from '@/common/types';
import { slugify } from '@/common/helpers';
import { NAMED_RANGES } from '../../common/constants';
import { cleanString } from '../utils';
import { Logger } from '@/common/logger';

/**
 * This retrieves the bank accounts set by the user.
 * It uses 2 named ranges to combine them together as a usable object
 *
 * example:
 * ```
 * {
 *   "Bank of America": "US1234567890",
 *   "Revolut": "GB1234567890"
 * }
 * ```
 *
 * @returns An object where the key is the label of the bank and the value the IBAN
 */
export function getBankAccounts(): ServerResponse<Record<string, string>> {
  try {
    const sheet = FireSpreadsheet;
    // retrieve account names and ibans
    // the ranges should only have one column so we use .flat()
    const accountNames = sheet
      .getRangeByName(NAMED_RANGES.accountNames)
      ?.getValues()
      ?.flat() as Array<string>;
    const ibans = sheet
      .getRangeByName(NAMED_RANGES.accounts)
      ?.getValues()
      ?.flat() as Array<string>;

    const bankAccounts: Record<string, string> = {};

    for (const [index, iban] of ibans?.entries() ?? []) {
      const label = cleanString(accountNames?.[index]);
      const cleanIban = cleanString(iban);

      if (cleanIban) {
        // this sets the label as the key and the iban as the value
        bankAccounts[label] = cleanIban;
      }
    }

    return { success: true, data: bankAccounts };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * This function returns the available bank account options to the client side
 */
export function getBankAccountOptions(): ServerResponse<BankOptions> {
  try {
    const accountNames = FireSpreadsheet.getRangeByName(NAMED_RANGES.accountNames);

    if (!accountNames) {
      return { success: true, data: {} };
    }

    const accounts = accountNames
      .getValues()
      // make sure not to include empty rows
      .filter((row) => row.some((cell: string) => cell !== '' && cell !== null))
      // flatten out the array so it is 1 dimensional with account names
      .flat();

    // we convert the account names to slugs and return them as an object
    const result = accounts.reduce<Record<string, string>>((obj: Record<string, string>, account: string) => {
      const slug = slugify(account);
      obj[slug] = account;
      return obj;
    }, {});

    return { success: true, data: result };
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function getBankAccountOptionsCached(): ServerResponse<BankOptions> {
  try {
    const cache = CacheService.getDocumentCache();
    const accountsCached = cache.get('accounts');

    if (accountsCached) {
      return { success: true, data: JSON.parse(accountsCached) };
    }

    const accountsResponse = getBankAccountOptions();
    if (accountsResponse.success && accountsResponse.data) {
      cache.put('accounts', JSON.stringify(accountsResponse.data), 600);
    }

    return accountsResponse;
  } catch (error) {
    Logger.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
