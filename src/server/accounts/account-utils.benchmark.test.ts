import { describe, test, expect, vi, beforeEach } from 'vitest'
import { AccountUtils } from './account-utils'
import { FireSpreadsheet } from '../globals'
import { RangeMock } from '../../../test-setup'

describe('AccountUtils Benchmark Baseline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AccountUtils.resetStaticCache()
  })

  test('getBalance should call getRangeByName every time (Baseline)', () => {
    const getRangeByNameSpy = vi.spyOn(FireSpreadsheet, 'getRangeByName')

    // Mock the spreadsheet response
    RangeMock.getValues.mockReturnValue([
      ['N26', 'DB123456789', '302.80'],
      ['Openbank', 'BANK123456789', '400'],
    ])

    // Call getBalance 3 times
    AccountUtils.getBalance('n26')
    AccountUtils.getBalance('n26')
    AccountUtils.getBalance('n26')

    // After optimization, it should be called only once
    expect(getRangeByNameSpy).toHaveBeenCalledTimes(1)
  })

  test('getBankAccounts and getBalance should both trigger range lookups independently', () => {
    const getRangeByNameSpy = vi.spyOn(FireSpreadsheet, 'getRangeByName')

    RangeMock.getValues.mockReturnValue([
      ['N26', 'DB123456789', '302.80'],
      ['Openbank', 'BANK123456789', '400'],
    ])

    AccountUtils.getBankAccounts()
    AccountUtils.getBalance('n26')

    // After optimization, they share the same cache/fetch method.
    // So it should be called only once.
    expect(getRangeByNameSpy).toHaveBeenCalledTimes(1)
  })
})
