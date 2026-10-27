import type { YMYLTransaction } from '../../src/common/types'

export const convertYMYLTransactionToBankDefinition = (transaction: YMYLTransaction): Record<string, unknown> => {
  return {
    Date: transaction.date,
    Amount: transaction.amount,
    Description: transaction.description,
  }
}
