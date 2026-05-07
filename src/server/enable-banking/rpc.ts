import type { ServerResponse } from '@/common/types'
import { AccountUtils } from '../accounts/account-utils'
import { EnableBankingApi } from './api'
import { syncEnableBankingTransactions } from './pipeline'

const SYNC_TRIGGER_HANDLER = 'syncEnableBankingTransactions'

function normalizeIban(iban: string) {
  return iban.replace(/\s+/g, '').toUpperCase()
}

export type EnableBankingConnection = {
  sessionId: string
  bankName: string
  accounts: { accountId: string, slug: string }[]
  createdAt: string
}

export function getEnableBankingConnections(): ServerResponse<EnableBankingConnection[]> {
  try {
    const props = PropertiesService.getUserProperties()
    const str = props.getProperty('ENABLE_BANKING_CONNECTIONS')
    return { success: true, data: str ? JSON.parse(str) : [] }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function removeEnableBankingConnection(sessionId: string): ServerResponse<void> {
  try {
    const props = PropertiesService.getUserProperties()
    let connections: EnableBankingConnection[] = []
    const str = props.getProperty('ENABLE_BANKING_CONNECTIONS')
    if (str) connections = JSON.parse(str)

    connections = connections.filter(c => c.sessionId !== sessionId)
    props.setProperty('ENABLE_BANKING_CONNECTIONS', JSON.stringify(connections))
    return { success: true }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function getEnableBankingAspsps(): ServerResponse<{ name: string, country: string }[]> {
  try {
    const aspspsResponse = EnableBankingApi.getAspsps()
    return { success: true, data: aspspsResponse.aspsps || [] }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}

export function startEnableBankingAuthorization(aspsp: { name: string, country: string }): ServerResponse<string> {
  try {
    const dummyRedirectUrl = 'https://enablebanking.com/callback'
    const state = Utilities.getUuid()
    const authResponse = EnableBankingApi.startAuthorization(aspsp, dummyRedirectUrl, state)
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
    const mappedAccounts: { accountId: string, slug: string }[] = []

    for (const acc of sessionResponse.accounts || []) {
      const iban = acc.account_id?.iban
      if (iban) {
        const match = Object.entries(configuredAccounts).find(
          ([_slug, configuredIban]) => normalizeIban(configuredIban) === normalizeIban(iban),
        )
        if (match) {
          mappedAccounts.push({ accountId: acc.uid, slug: match[0] })
        }
      }
    }

    if (mappedAccounts.length === 0) {
      return { success: false, error: 'Session authorized, but none of the bank accounts matched the IBANs configured in your spreadsheet. Transactions cannot be synced.' }
    }

    const props = PropertiesService.getUserProperties()
    let connections: EnableBankingConnection[] = []
    const existingStr = props.getProperty('ENABLE_BANKING_CONNECTIONS')
    if (existingStr) {
      connections = JSON.parse(existingStr)
    }

    connections.push({
      sessionId: sessionResponse.session_id,
      bankName: bankName,
      accounts: mappedAccounts,
      createdAt: new Date().toISOString(),
    })

    props.setProperty('ENABLE_BANKING_CONNECTIONS', JSON.stringify(connections))

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
    const freqType = (props.getProperty('ENABLE_BANKING_TRIGGER_FREQ_TYPE') as 'hours' | 'days') || 'days'
    const freqVal = parseInt(props.getProperty('ENABLE_BANKING_TRIGGER_FREQ_VAL') || '1', 10)

    return {
      success: true,
      data: {
        enabled: !!existingTrigger,
        frequencyType: freqType,
        frequencyValue: freqVal,
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
      props.setProperty('ENABLE_BANKING_TRIGGER_FREQ_TYPE', frequencyType)
      props.setProperty('ENABLE_BANKING_TRIGGER_FREQ_VAL', frequencyValue.toString())
    }

    return { success: true }
  }
  catch (error) {
    return { success: false, error: String(error) }
  }
}
