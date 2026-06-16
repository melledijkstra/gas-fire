import { describe, expect, it } from 'vitest'
import { resolveContraIban } from './pipeline'
import { normalizeIban } from './utils'

describe('normalizeIban', () => {
  it('removes spaces and uppercases an IBAN', () => {
    expect(normalizeIban('NL12 ABCD 0123 4567 89')).toBe('NL12ABCD0123456789')
    expect(normalizeIban('nl12abcd0123456789')).toBe('NL12ABCD0123456789')
  })

  it('returns empty string for empty input', () => {
    expect(normalizeIban('')).toBe('')
  })
})

describe('contra_iban null assignment logic (issue #316)', () => {
  const tx = {
    creditor_account: { iban: 'NL99ZZZZ9876543210' },
    debtor_account: { iban: 'NL12ABCD0123456789' },
  }
  const ACCOUNT_IBAN = 'NL12ABCD0123456789'

  it('returns the contra IBAN when it differs from the account IBAN', () => {
    const result = resolveContraIban(tx, ACCOUNT_IBAN)
    expect(result).toBe('NL99ZZZZ9876543210')
  })

  it('returns null when there is no contra IBAN (empty string)', () => {
    // fix for issue #316: empty string must become null, not ''
    const emptyTx = {}

    const result = resolveContraIban(emptyTx, ACCOUNT_IBAN)
    expect(result).toBeNull()
  })

  it('returns null when contra IBAN equals the account IBAN (self-transfer)', () => {
    const selfTransferTx = {
      creditor_account: { iban: ACCOUNT_IBAN },
      debtor_account: { iban: ACCOUNT_IBAN },
    }

    const result = resolveContraIban(selfTransferTx, ACCOUNT_IBAN)
    expect(result).toBeNull()
  })
})
