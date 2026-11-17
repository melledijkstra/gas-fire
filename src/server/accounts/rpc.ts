import type { AccountOptions, ServerResponse } from '@/common/types'
import { withRpcHandler } from '../rpc-handler'
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
export const getAccountOptions = withRpcHandler(
  'getAccountOptions',
  (): ServerResponse<AccountOptions> => ({
    success: true,
    data: AccountUtils.getAccountOptions(),
  }),
)
