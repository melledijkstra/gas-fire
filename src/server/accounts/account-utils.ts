import { FireSpreadsheet } from '../globals'
import { NAMED_RANGES } from '@/common/constants'
import { getBankAccountOptionsCached } from '../accounts/rpc'
import { slugify } from '@/common/helpers'

const BANK_ACCOUNTS_CACHE_KEY = 'bank_accounts_v2'

const CACHE_EXPIRATION_SECONDS = 10 * 60 // 10 minutes

interface AccountInfo {
  label: string
  iban: string
  balance: number | null
}

export const isNumeric = (value: unknown): boolean => {
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value === 'string' && value.trim() !== '') {
    return Number.isFinite(Number(value))
  }
  return false
}

export class AccountUtils {
  private static cachedAccountsData: Record<string, AccountInfo> | null = null

  private static fetchAccountsData(): Record<string, AccountInfo> {
    if (this.cachedAccountsData) {
      return this.cachedAccountsData
    }

    const cache = CacheService.getDocumentCache()
    const cachedData = cache?.get(BANK_ACCOUNTS_CACHE_KEY)
    if (cachedData) {
      try {
        this.cachedAccountsData = JSON.parse(cachedData)
        return this.cachedAccountsData!
      }
      catch {
        // Fall back to live retrieval if parsing fails
      }
    }

    // this range contains the ibans only
    const ibans = FireSpreadsheet.getRangeByName(NAMED_RANGES.accounts)
    // we also need to include the labels and balances
    const accounts = ibans
      ?.offset(0, -1, ibans.getNumRows(), 3)
      .getValues()
      // make sure not to include empty rows
      .filter(row => row.some((cell: unknown) => cell !== '' && cell !== null))

    if (!accounts?.length) {
      return {} // return empty list of bank accounts if none setup
    }

    const result: Record<string, AccountInfo> = {}

    for (const account of accounts) {
      const [label, iban, balance] = account
      const slugifiedId = slugify(label)

      result[slugifiedId] = {
        label,
        iban,
        balance: isNumeric(balance) ? Number.parseFloat(balance) : null,
      }
    }

    this.cachedAccountsData = result
    cache?.put(BANK_ACCOUNTS_CACHE_KEY, JSON.stringify(result), CACHE_EXPIRATION_SECONDS)

    return result
  }

  static getBankAccounts(): Record<string, string> {
    const data = this.fetchAccountsData()
    const result: Record<string, string> = {}

    for (const [slug, info] of Object.entries(data)) {
      result[slug] = info.iban
    }

    return result
  }

  static getBankIban(bankId: string): string {
    const bankAccounts = AccountUtils.getBankAccounts()
    return bankAccounts?.[bankId] ?? ''
  }

  static getBalance(accountIdentifier: string): number {
    const data = this.fetchAccountsData()
    const account = data[accountIdentifier]

    if (!account) {
      throw new Error(`Account '${accountIdentifier}' not found`)
    }

    if (account.balance === null) {
      throw new Error(`Could not retrieve balance of ${accountIdentifier}`)
    }

    return account.balance
  }

  static getAccountIdentifiers(): string[] {
    return Object.keys(getBankAccountOptionsCached())
  }

  static calculateNewBalance(bankAccount: string, values: number[]) {
    let balance = this.getBalance(bankAccount)

    for (const amount of values) {
      balance += amount
    }

    return balance
  }

  /**
   * Resets the static cache. Used for testing.
   */
  static resetStaticCache() {
    this.cachedAccountsData = null
  }
}
