import type { ServerResponse } from '@/common/types'
import { AccountUtils } from '../accounts/account-utils'
import { EnableBankingApi } from './api'
import { PROP_ENABLE_BANKING_CONNECTIONS, PROP_ENABLE_BANKING_TRIGGER_FREQ_TYPE, PROP_ENABLE_BANKING_TRIGGER_FREQ_VAL, REDIRECT_URL } from './config'
import { syncEnableBankingTransactions } from './pipeline'
import { normalizeIban } from './utils'

const SYNC_TRIGGER_HANDLER = syncEnableBankingTransactions.name

function isBankConnection(obj: unknown): obj is EnableBankingConnection {
  return obj !== null
    && typeof obj === 'object'
    && 'sessionId' in obj && typeof obj.sessionId === 'string'
    && 'bankName' in obj && typeof obj.bankName === 'string'
    && 'accounts' in obj && Array.isArray(obj.accounts)
    && 'createdAt' in obj && typeof obj.createdAt === 'string'
}

export type EnableBankingConnection = {
  sessionId: string
  bankName: string
  accounts: { accountId: string, slug: string }[]
  createdAt: string
}

function getEnableBankingConnections(): EnableBankingConnection[] {
  const props = PropertiesService.getUserProperties()
  const str = props.getProperty(PROP_ENABLE_BANKING_CONNECTIONS)
  const parsed = str ? JSON.parse(str) : []
  if (Array.isArray(parsed) && parsed.every(isBankConnection)) {
    return parsed
  }
  return []
}

export function RPCgetEnableBankingConnections(): ServerResponse<EnableBankingConnection[]> {
  try {
    const connections = getEnableBankingConnections()
    return { success: true, data: connections }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function removeEnableBankingConnection(sessionId: string): ServerResponse<void> {
  try {
    const props = PropertiesService.getUserProperties()
    let connections = getEnableBankingConnections()

    connections = connections.filter(c => c.sessionId !== sessionId)
    props.setProperty(PROP_ENABLE_BANKING_CONNECTIONS, JSON.stringify(connections))
    return { success: true }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function getEnableBankingAspsps(): ServerResponse<{ name: string, country: string, logo?: string, connected?: boolean }[]> {
  try {
    const aspspsResponse = EnableBankingApi.getAspsps()
    const connections = getEnableBankingConnections()

    const aspsps = (aspspsResponse.aspsps || []).map(aspsp => ({
      ...aspsp,
      connected: connections.some(c => c.bankName === aspsp.name),
    }))

    // Sort so connected banks are first, then alphabetically by name
    aspsps.sort((a, b) => {
      if (a.connected && !b.connected) return -1
      if (!a.connected && b.connected) return 1
      return a.name.localeCompare(b.name)
    })

    return { success: true, data: aspsps }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function startEnableBankingAuthorization(aspsp: { name: string, country: string }): ServerResponse<string> {
  try {
    const state = Utilities.getUuid()
    const authResponse = EnableBankingApi.startAuthorization(aspsp, REDIRECT_URL, state)
    return { success: true, data: authResponse.url }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function completeEnableBankingAuthorization(code: string, bankName: string): ServerResponse<number> {
  try {
    const sessionResponse = EnableBankingApi.authorizeSession(code)
    const configuredAccounts = AccountUtils.getBankAccounts()
    let mappedAccounts: { accountId: string, slug: string }[] = []

    for (const account of sessionResponse.accounts ?? []) {
      const iban = account.account_id?.iban
      if (iban) {
        const match = Object.entries(configuredAccounts).find(
          ([_slug, configuredIban]) => normalizeIban(configuredIban) === normalizeIban(iban),
        )
        if (match) {
          mappedAccounts.push({ accountId: account.uid, slug: match[0] })
        }
      }
    }

    if (mappedAccounts.length === 0) {
      return { success: false, error: 'Session authorized, but none of the bank accounts matched the IBANs configured in your spreadsheet. Transactions cannot be synced.' }
    }

    const props = PropertiesService.getUserProperties()
    const connections = getEnableBankingConnections()

    // Check for duplicate accounts across existing connections to prevent duplicate transactions
    const existingMappedAccountIds = new Set(
      connections.flatMap(c => c.accounts.map(a => a.accountId)),
    )

    mappedAccounts = mappedAccounts.filter(acc => !existingMappedAccountIds.has(acc.accountId))

    if (mappedAccounts.length === 0) {
      return { success: false, error: 'Session authorized, but all matching bank accounts have already been connected. No new connections were created.' }
    }

    connections.push({
      sessionId: sessionResponse.session_id,
      bankName: bankName,
      accounts: mappedAccounts,
      createdAt: new Date().toISOString(),
    })

    props.setProperty(PROP_ENABLE_BANKING_CONNECTIONS, JSON.stringify(connections))

    return { success: true, data: mappedAccounts.length }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function triggerEnableBankingSync(): ServerResponse<void> {
  try {
    syncEnableBankingTransactions()
    return { success: true, message: 'Sync completed.' }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function getEnableBankingTriggerStatus(): ServerResponse<{ enabled: boolean, frequencyType: 'hours' | 'days', frequencyValue: number }> {
  try {
    const triggers = ScriptApp.getProjectTriggers()
    const existingTrigger = triggers.find(t => t.getHandlerFunction() === SYNC_TRIGGER_HANDLER)

    const props = PropertiesService.getUserProperties()
    const frequencyRaw = props.getProperty(PROP_ENABLE_BANKING_TRIGGER_FREQ_VAL)
    const frequencyTypeRaw = props.getProperty(PROP_ENABLE_BANKING_TRIGGER_FREQ_TYPE)
    const frequencyType = (frequencyTypeRaw as 'hours' | 'days') || 'days'
    const frequency = Number.parseInt(frequencyRaw || '1', 10)

    return {
      success: true,
      data: {
        enabled: !!existingTrigger,
        frequencyType: frequencyType,
        frequencyValue: frequency,
      },
    }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function setEnableBankingTrigger(enabled: boolean, frequencyType: 'hours' | 'days', frequencyValue: number): ServerResponse<void> {
  try {
    const triggers = ScriptApp.getProjectTriggers()
    const existingTrigger = triggers.find(t => t.getHandlerFunction() === SYNC_TRIGGER_HANDLER)

    if (existingTrigger) {
      ScriptApp.deleteTrigger(existingTrigger)
    }

    if (enabled) {
      const builder = ScriptApp.newTrigger(SYNC_TRIGGER_HANDLER).timeBased()
      if (frequencyType === 'hours') {
        builder.everyHours(frequencyValue)
      }
      else {
        builder.everyDays(frequencyValue).atHour(2)
      }
      builder.create()

      const props = PropertiesService.getUserProperties()
      props.setProperty(PROP_ENABLE_BANKING_TRIGGER_FREQ_TYPE, frequencyType)
      props.setProperty(PROP_ENABLE_BANKING_TRIGGER_FREQ_VAL, frequencyValue.toString())
    }

    return { success: true }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}
