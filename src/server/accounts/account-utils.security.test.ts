import { CacheServiceMock, RangeMock } from '../../../test-setup'
import { AccountUtils } from './account-utils'

describe('AccountUtils Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AccountUtils.resetStaticCache()
  })

  test('should fall back to live retrieval if cached data is malformed', () => {
    const cacheGetMock = vi.fn()
    CacheServiceMock.getDocumentCache.mockReturnValue({
      get: cacheGetMock,
      put: vi.fn(),
    } as unknown as GoogleAppsScript.Cache.Cache)

    // Mock cache to return data with missing required fields
    cacheGetMock.mockReturnValue(JSON.stringify({
      'malicious-account': {
        notLabel: 'Not a label',
        notIban: 'Not an IBAN',
      },
    }))

    // Mock live retrieval to return valid data
    RangeMock.getValues.mockReturnValueOnce([
      ['N26', 'DB123456789', '302.80'],
    ])

    const accounts = AccountUtils.getBankAccounts()

    // If it used the malicious cache, it would have 'malicious-account'
    // If it fell back to live retrieval, it should have 'n26'
    expect(accounts).toHaveProperty('n26')
    expect(accounts).not.toHaveProperty('malicious-account')
  })
})
