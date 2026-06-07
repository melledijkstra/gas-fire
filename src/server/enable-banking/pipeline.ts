import { FIRE_COLUMNS } from '@/common/constants'
import { Logger } from '@/common/logger'
import { FireTable } from '@/common/table/FireTable'
import { AccountUtils } from '../accounts/account-utils'
import { Config } from '../config'
import { enableBankingPipeline } from '../import-pipeline/rpc'
import { Transformers } from '../transformers'
import { EnableBankingApi } from './api'
import type { EnableBankingTransaction } from './types'
import { getEnableBankingConnections, normalizeIban } from './utils'

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

function fetchAndMapToFireTable(enableBankingAccount: string, config: Config): FireTable | null {
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
    const row = new Array(FIRE_COLUMNS.length).fill('')

    row[FireTable.getFireColumnIndex('amount')] = Transformers.transformMoney(getTransactionAmount(tx))
    row[FireTable.getFireColumnIndex('currency')] = tx.transaction_amount?.currency || ''
    row[FireTable.getFireColumnIndex('date')] = Transformers.transformDate(getTransactionDate(tx))
    row[FireTable.getFireColumnIndex('contra_account')] = tx.creditor?.name || tx.debtor?.name || ''

    const contraIban = tx.creditor_account?.iban || tx.debtor_account?.iban || ''
    row[FireTable.getFireColumnIndex('contra_iban')] = (normalizeIban(contraIban) === normalizeIban(iban)) ? '' : contraIban

    row[FireTable.getFireColumnIndex('description')] = tx.remittance_information?.join(' ') || tx.note || ''
    row[FireTable.getFireColumnIndex('import_date')] = importDate
    row[FireTable.getFireColumnIndex('iban')] = iban

    return row
  })

  return new FireTable(data)
}

export function syncEnableBankingTransactions() {
  Logger.log('Starting Enable Banking Daily Sync...')

  const connections = getEnableBankingConnections()
  Logger.log(`Found ${connections.length} banking connection(s) to sync.`)

  for (const connection of connections) {
    Logger.log(`Processing connection for bank: ${connection.aspsp.name} (${connection.aspsp.country})`)

    for (const account of connection.accounts) {
      Logger.log(`Fetching transactions for account slug: ${account.slug}`)

      try {
        const config = Config.getAccountConfiguration(account.slug)
        const fireTable = fetchAndMapToFireTable(account.accountId, config)

        if (!fireTable) {
          Logger.log(`No new transactions found for ${account.slug}`)
          continue
        }

        Logger.log(`Converted ${fireTable.getRowCount()} transactions for ${account.slug} into FireTable`)

        const result = enableBankingPipeline(fireTable, account.slug)

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
