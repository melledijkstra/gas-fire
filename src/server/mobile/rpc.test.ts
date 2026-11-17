import { SOURCE_SHEET_ID } from '@/common/constants'
import { buildMobileDashboardFixture } from '@/fixtures/mobile-budget'
import { SheetMock } from '../../../test-setup'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import { getMobileDashboardData, updateMobileTransaction } from './rpc'
import * as mobileService from './service'

describe('mobile budget RPCs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    SheetMock.getSheetId.mockReturnValue(SOURCE_SHEET_ID)
  })

  test('getMobileDashboardData returns success payload when service succeeds', () => {
    const mockData = buildMobileDashboardFixture()
    vi.spyOn(mobileService, 'buildMobileDashboardData').mockReturnValueOnce(mockData)

    const response = getMobileDashboardData()
    expect(response).toEqual({
      success: true,
      data: mockData,
    })
  })

  test('getMobileDashboardData returns error response when service throws', () => {
    vi.spyOn(mobileService, 'buildMobileDashboardData').mockImplementationOnce(() => {
      throw new Error('Sheet read failed')
    })

    const response = getMobileDashboardData()
    expect(response).toEqual({
      success: false,
      error: 'Sheet read failed',
    })
  })

  test('updateMobileTransaction updates sheet and resets YMYLSheet cache', () => {
    vi.spyOn(mobileService, 'updateTransactionInSheet').mockReturnValueOnce({ rowIndex: 10 })
    const resetCacheSpy = vi.spyOn(YMYLSheet, 'resetCache')

    const response = updateMobileTransaction({
      rowIndex: 10,
      ref: 'tx-10',
      category: 'Food & Groceries',
      comments: 'Weekly market',
    })

    expect(response).toEqual({
      success: true,
      data: { rowIndex: 10 },
    })
    expect(resetCacheSpy).toHaveBeenCalledTimes(1)
  })

  test('updateMobileTransaction returns error response when update fails', () => {
    vi.spyOn(mobileService, 'updateTransactionInSheet').mockImplementationOnce(() => {
      throw new Error('Row not found')
    })

    const response = updateMobileTransaction({
      rowIndex: 99,
      ref: 'tx-missing',
      category: 'Food & Groceries',
      comments: '',
    })

    expect(response).toEqual({
      success: false,
      error: 'Row not found',
    })
  })
})
