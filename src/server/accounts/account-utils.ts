import { NAMED_RANGES } from '@/common/constants'
import { slugify } from '@/common/helpers'
import { Table } from '@/common/table/Table'
import { FireSpreadsheet } from '../globals'
import { cleanString } from '../utils'

const BANK_ACCOUNTS_CACHE_KEY = 'bank_accounts_v2'

const CACHE_EXPIRATION_SECONDS = 10 * 60 // 10 minutes

interface AccountInfo {
  label: string
  iban: string
  balance: number | null
}

function isAccountInfo(value: unknown): value is AccountInfo {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const info = value as Record<string, unknown>
  return (
    typeof info.label === 'string'
    && typeof info.iban === 'string'
    && (info.balance === null || typeof info.balance === 'number')
  )
}

function isAccountInfoRecord(value: unknown): value is Record<string, AccountInfo> {
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).every(isAccountInfo)
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
        const parsed = JSON.parse(cachedData)
        if (isAccountInfoRecord(parsed)) {
          this.cachedAccountsData = parsed
          return this.cachedAccountsData
        }
      }
      catch {
        // Fall back to live retrieval if parsing fails
      }
    }

    // this range contains the ibans only
    const ibansRange = FireSpreadsheet.getRangeByName(NAMED_RANGES.accounts)
    if (!ibansRange) {
      return {}
    }

    // we also need to include the labels and balances
    // Assumptions: [Account Name, IBAN, Balance] are adjacent columns
    const accounts = ibansRange
      .offset(0, -1, ibansRange.getNumRows(), 3)
      .getValues()

    const cleanedAccounts = Table.removeEmptyRows(accounts)

    if (!cleanedAccounts.length) {
      return {} // return empty list of bank accounts if none setup
    }

    const result: Record<string, AccountInfo> = {}

    for (const account of cleanedAccounts) {
      const [labelRaw, ibanRaw, balance] = account
      const label = cleanString(String(labelRaw))
      const iban = cleanString(String(ibanRaw))
      const slugifiedId = slugify(label)

      if (iban) {
        result[slugifiedId] = {
          label,
          iban,
          balance: isNumeric(balance) ? Number.parseFloat(String(balance)) : null,
        }
      }
    }

    this.cachedAccountsData = result
    cache?.put(BANK_ACCOUNTS_CACHE_KEY, JSON.stringify(result), CACHE_EXPIRATION_SECONDS)

    return result
  }

  /**
   * Returns a record of bank accounts where the key is the slugified label and the value is the IBAN.
   */
  static getBankAccounts(): Record<string, string> {
    const data = this.fetchAccountsData()
    const result: Record<string, string> = {}

    for (const [slug, info] of Object.entries(data)) {
      result[slug] = info.iban
    }

    return result
  }

  /**
   * Returns a record of bank accounts where the key is the label and the value is the IBAN.
   * Primarily used for the legacy RPC getBankAccounts.
   */
  static getBankAccountsByLabel(): Record<string, string> {
    const data = this.fetchAccountsData()
    const result: Record<string, string> = {}

    for (const info of Object.values(data)) {
      result[info.label] = info.iban
    }

    return result
  }

  /**
   * Returns account options where the key is the slugified label and the value is the label.
   */
  static getAccountOptions(): Record<string, string> {
    const data = this.fetchAccountsData()
    const result: Record<string, string> = {}

    for (const [slug, info] of Object.entries(data)) {
      result[slug] = info.label
    }

    return result
  }

  static getAccountIban(accountId: string): string {
    const data = this.fetchAccountsData()
    return data[accountId]?.iban ?? ''
  }

  static getBalance(accountId: string): number {
    const data = this.fetchAccountsData()
    const account = data[accountId]

    if (!account) {
      throw new Error(`Account '${accountId}' not found`)
    }

    if (account.balance === null) {
      throw new Error(`Could not retrieve balance of ${accountId}`)
    }

    return account.balance
  }

  static getAccountIdentifiers(): string[] {
    return Object.keys(this.fetchAccountsData())
  }

  static calculateNewBalance(accountId: string, values: number[]) {
    let balance = this.getBalance(accountId)

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
