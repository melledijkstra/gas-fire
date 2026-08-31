import { FIRE_COLUMNS } from '@/common/constants'
import { FireTable } from '@/common/table/FireTable'
import { AccountUtils } from '../accounts/account-utils'
import { Config } from '../config'
import { Transformers } from '../transformers'
import { EnableBankingApi } from './api'
import type { EnableBankingTransaction } from './types'
import { normalizeIban } from './utils'

/**
 * Returns the contra IBAN for a transaction, or null if there is none or it matches
 * the account's own IBAN. Null ensures Google Sheets stores a truly empty cell so that
 * formulas like COUNTIF don't count it as a value (fixes issue #316).
 */
export function resolveContraIban(tx: EnableBankingTransaction, iban: string): string | null {
  const contraIban = tx.creditor_account?.iban || tx.debtor_account?.iban || ''
  const isSelfTransfer = normalizeIban(contraIban) === normalizeIban(iban)
  return contraIban && !isSelfTransfer ? contraIban : null
}

function getTransactionDate(tx: EnableBankingTransaction): string {
  if (tx.value_date) return tx.value_date
  if (tx.booking_date) return tx.booking_date
  if (tx.transaction_date) return tx.transaction_date
  return ''
}

function getTransactionAmount(tx: EnableBankingTransaction): string {
  const amount = tx.transaction_amount?.amount || ''
  if (!amount) return ''

  if (tx.credit_debit_indicator === 'DBIT' && !amount.startsWith('-')) {
    return `-${amount}`
  }
  if (tx.credit_debit_indicator === 'CRDT' && amount.startsWith('-')) {
    return amount.substring(1)
  }
  return amount
}

export function fetchAndMapToFireTable(enableBankingAccount: string, config: Config): FireTable | null {
  // Only fetch transactions from the last 7 days to avoid huge payloads,
  // duplicate detection will handle overlaps.
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const response = EnableBankingApi.getAccountTransactions(enableBankingAccount, dateFrom)
  const transactions: EnableBankingTransaction[] = response.transactions || []

  if (transactions.length === 0) {
    return null
  }

  const importDate = new Date()
  const iban = AccountUtils.getAccountIban(config.getAccountId())

  const data = transactions.map((tx) => {
    const row = new Array(FIRE_COLUMNS.length).fill(null)

    row[FireTable.getFireColumnIndex('amount')] = Transformers.transformMoney(getTransactionAmount(tx))
    row[FireTable.getFireColumnIndex('currency')] = tx.transaction_amount?.currency || ''
    row[FireTable.getFireColumnIndex('date')] = Transformers.transformDate(getTransactionDate(tx))
    row[FireTable.getFireColumnIndex('contra_account')] = tx.creditor?.name || tx.debtor?.name || ''

    row[FireTable.getFireColumnIndex('contra_iban')] = resolveContraIban(tx, iban)

    row[FireTable.getFireColumnIndex('description')] = tx.remittance_information?.join(' ') || tx.note || ''
    row[FireTable.getFireColumnIndex('import_date')] = importDate
    row[FireTable.getFireColumnIndex('iban')] = iban

    return row
  })

  return new FireTable(data)
}
