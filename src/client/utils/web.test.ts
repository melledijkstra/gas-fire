import { afterEach, describe, expect, it, vi } from 'vitest'
import { getBrowserLocale } from './web'

describe('getBrowserLocale', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return the first language from navigator.languages if defined', () => {
    vi.stubGlobal('navigator', {
      languages: ['en-GB', 'en-US', 'nl-NL'],
      language: 'en-GB',
    })

    expect(getBrowserLocale()).toBe('en-GB')
  })

  it('should return navigator.language if navigator.languages is undefined', () => {
    vi.stubGlobal('navigator', {
      languages: undefined,
      language: 'nl-NL',
    })

    expect(getBrowserLocale()).toBe('nl-NL')
  })

  it('should return navigator.language if navigator.languages is an empty array', () => {
    vi.stubGlobal('navigator', {
      languages: [],
      language: 'en-US',
    })

    expect(getBrowserLocale()).toBe('en-US')
  })
})
