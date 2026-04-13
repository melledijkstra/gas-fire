import type { AccountOptions, ServerResponse } from '@/common/types'
import { Logger } from '@/common/logger'
import { AccountUtils } from './account-utils'

/**
 * This function returns the available bank account options to the client side
 *
 * @example
 * ```
 * {
 *    bank_of_america: 'Bank of America',
 *    commerzbank: 'Commerzbank',
 *    ing: 'ING',
 *    revolut: 'Revolut'
 * }
 * ```
 */
export function getAccountOptions(): ServerResponse<AccountOptions> {
  try {
    const options = AccountUtils.getAccountOptions()
    return { success: true, data: options }
  }
  catch (error) {
    Logger.error(error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
