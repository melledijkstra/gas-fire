export type EnableBankingConnection = {
  sessionId: string
  bankName: string
  accounts: { accountId: string, slug: string }[]
  createdAt: string
}

export type EnableBankingTransaction = {
  transaction_amount?: { amount: string, currency: string }
  value_date?: string
  booking_date?: string
  transaction_date?: string
  creditor?: { name: string }
  debtor?: { name: string }
  creditor_account?: { iban: string }
  debtor_account?: { iban: string }
  remittance_information?: string[]
  note?: string
  credit_debit_indicator?: string
}
