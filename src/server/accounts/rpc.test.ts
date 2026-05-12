import { RangeMock } from '../../../test-setup'
import { AccountUtils } from './account-utils'
import { getAccountOptions } from './rpc'

describe('RPC: Account Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    AccountUtils.resetStaticCache()
  })

  describe('getAccountOptions', () => {
    test('in case there are no accounts, it should return an empty object', () => {
      RangeMock.getValues.mockReturnValue([])
      const result = getAccountOptions()
      expect(result).toEqual({ success: true, data: {} })
    })

    test('should return a list of accounts', () => {
      RangeMock.getValues.mockReturnValue([
        ['n26', 'DB123456789', '100'],
        ['Openbank', 'BANK123456789', '200'],
      ])
      const result = getAccountOptions()
      expect(result).toEqual({
        success: true,
        data: {
          n26: 'n26',
          openbank: 'Openbank',
        },
      })
    })
  })
})
