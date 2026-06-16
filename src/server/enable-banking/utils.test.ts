import { describe, expect, it } from 'vitest'
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
  // replicates the logic from pipeline.ts so we can unit-test it without GAS globals
  function resolveContraIban(contraIban: string, iban: string): string | null {
    const isSelfTransfer = normalizeIban(contraIban) === normalizeIban(iban)
    return contraIban && !isSelfTransfer ? contraIban : null
  }

  const ACCOUNT_IBAN = 'NL12ABCD0123456789'

  it('returns the contra IBAN when it differs from the account IBAN', () => {
    const result = resolveContraIban('NL99ZZZZ9876543210', ACCOUNT_IBAN)
    expect(result).toBe('NL99ZZZZ9876543210')
  })

  it('returns null when there is no contra IBAN (empty string)', () => {
    // fix for issue #316: empty string must become null, not ''
    const result = resolveContraIban('', ACCOUNT_IBAN)
    expect(result).toBeNull()
  })

  it('returns null when contra IBAN equals the account IBAN (self-transfer)', () => {
    const result = resolveContraIban(ACCOUNT_IBAN, ACCOUNT_IBAN)
    expect(result).toBeNull()
  })

  it('returns null when contra IBAN equals account IBAN ignoring spaces and case', () => {
    const result = resolveContraIban('nl12 abcd 0123 4567 89', ACCOUNT_IBAN)
    expect(result).toBeNull()
  })
})
