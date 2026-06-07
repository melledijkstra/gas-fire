import { PROP_ENABLE_BANKING_CONNECTIONS } from './config'
import type { Aspsp, EnableBankingConnection } from './types'

export function normalizeIban(iban: string) {
  return iban.replace(/\s+/g, '').toUpperCase()
}

function isAspsp(obj: unknown): obj is Aspsp {
  return obj !== null
    && typeof obj === 'object'
    && 'name' in obj && typeof obj.name === 'string'
    && 'country' in obj && typeof obj.country === 'string'
}

function isBankConnection(obj: unknown): obj is EnableBankingConnection {
  return obj !== null
    && typeof obj === 'object'
    && 'sessionId' in obj && typeof obj.sessionId === 'string'
    && 'aspsp' in obj && typeof obj.aspsp === 'object'
    && isAspsp(obj.aspsp)
    && 'accounts' in obj && Array.isArray(obj.accounts)
    && 'createdAt' in obj && typeof obj.createdAt === 'string'
}

export function getEnableBankingConnections(): EnableBankingConnection[] {
  const props = PropertiesService.getUserProperties()
  const str = props.getProperty(PROP_ENABLE_BANKING_CONNECTIONS)
  const parsed = str ? JSON.parse(str) : []
  if (Array.isArray(parsed)) {
    return parsed.filter(isBankConnection)
  }
  return []
}
