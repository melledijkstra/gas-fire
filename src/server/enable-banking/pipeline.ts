import { Logger } from '@/common/logger'
import type { RawTable } from '@/common/types'
import { EnableBankingApi } from './api'
import { importPipeline } from '../import-pipeline/rpc'

type EnableBankingConnection = {
  sessionId: string
  bankName: string
  accounts: { accountId: string, slug: string }[]
  createdAt: string
}

type EnableBankingTransaction = {
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

function fetchAndTransformTransactions(accountId: string): RawTable | null {
  // Only fetch transactions from the last 7 days to avoid huge payloads,
  // duplicate detection will handle overlaps.
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const response = EnableBankingApi.getAccountTransactions(accountId, dateFrom)
  const transactions: EnableBankingTransaction[] = response.transactions || []

  if (transactions.length === 0) {
    return null
  }

  // Transform JSON transactions into a Table format
  // We define a standard set of headers that our mapping config should expect.
  const headers = ['Amount', 'Currency', 'Date', 'Payee', 'IBAN', 'Description']

  const rawData: RawTable = [headers]

  rawData.push(...transactions.map(mapTransactionToRow))

  return rawData
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

function mapTransactionToRow(tx: EnableBankingTransaction): string[] {
  const amount = getTransactionAmount(tx)
  const currency = tx.transaction_amount?.currency || ''
  const date = getTransactionDate(tx)
  const payee = tx.creditor?.name || tx.debtor?.name || ''
  const iban = tx.creditor_account?.iban || tx.debtor_account?.iban || ''
  const description = tx.remittance_information?.join(' ') || tx.note || ''

  return [
    amount,
    currency,
    date,
    payee,
    iban,
    description,
  ]
}

export function syncEnableBankingTransactions() {
  Logger.log('Starting Enable Banking Daily Sync...')

  const props = PropertiesService.getUserProperties()
  const connectionsStr = props.getProperty('ENABLE_BANKING_CONNECTIONS')

  if (!connectionsStr) {
    Logger.log('No Enable Banking connections found. Exiting.')
    return
  }

  let connections: EnableBankingConnection[]
  try {
    connections = JSON.parse(connectionsStr)
  }
  catch (e) {
    Logger.error('Failed to parse connections', e)
    return
  }

  for (const connection of connections) {
    Logger.log(`Processing connection for bank: ${connection.bankName}`)

    for (const account of connection.accounts) {
      Logger.log(`Fetching transactions for account slug: ${account.slug}`)

      try {
        const rawData = fetchAndTransformTransactions(account.accountId)
        if (!rawData) {
          Logger.log(`No new transactions found for ${account.slug}`)
          continue
        }

        Logger.log(`Converted ${rawData.length - 1} transactions for ${account.slug} into RawTable`)

        // Important: Note that for this to work, the user MUST configure the 'import-settings'
        // sheet for the relevant account slug to map:
        // amount -> Amount
        // date -> Date
        // contra_account -> Payee
        // contra_iban -> IBAN
        // description -> Description
        // currency -> Currency

        const result = importPipeline(rawData, account.slug)

        if (result.success) {
          Logger.log(`Successfully synced ${account.slug}: ${result.message}`)
        }
        else {
          Logger.error(`Failed to sync ${account.slug}: ${result.error}`)
        }
      }
      catch (e) {
        Logger.error(`Error syncing account ${account.slug}`, e)
      }
    }
  }
  Logger.log('Enable Banking Daily Sync completed.')
}
