import { FireTransaction } from "../../src/common/types"

export const convertFireTransactionToBankDefinition = (transaction: FireTransaction): Record<string, unknown> => {
  return {
    'Date': transaction.date,
    'Amount': transaction.amount,
    'Description': transaction.description
  }
}
