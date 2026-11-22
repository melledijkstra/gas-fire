import { SOURCE_SHEET_ID } from '@/common/constants'
import {
  buildMobileDashboardFixture,
  buildMobileTransactionsPageFixture,
} from '@/fixtures/mobile-budget'
import { SheetMock } from '../../../test-setup'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import {
  getMobileDashboardData,
  getMobileTransactionsPage,
  updateMobileSubcategoryBudget,
  updateMobileTransaction,
} from './rpc'
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

  test('getMobileTransactionsPage returns paginated transactions payload', () => {
    const mockPage = buildMobileTransactionsPageFixture(20, 10, 40)
    vi.spyOn(mobileService, 'buildMobileTransactionsPage').mockReturnValueOnce(mockPage)

    const response = getMobileTransactionsPage(20, 10)
    expect(response).toEqual({
      success: true,
      data: mockPage,
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

  test('updateMobileSubcategoryBudget returns updated subcategory months on success', () => {
    const updatedMonths = Array.from({ length: 12 }, () => -250)
    vi.spyOn(mobileService, 'updateSubcategoryBudgetInSheet').mockReturnValueOnce({
      rowIndex: 42,
      updatedSubcategoryMonths: updatedMonths,
    })

    const response = updateMobileSubcategoryBudget({
      year: 2026,
      category: 'Food & Groceries',
      subcategoryName: 'Groceries',
      rowIndex: 42,
      monthUpdates: { 11: -250 },
    })

    expect(response).toEqual({
      success: true,
      data: {
        rowIndex: 42,
        updatedSubcategoryMonths: updatedMonths,
      },
    })
  })

  test('updateMobileSubcategoryBudget returns error response when service throws', () => {
    vi.spyOn(mobileService, 'updateSubcategoryBudgetInSheet').mockImplementationOnce(() => {
      throw new Error('Year sheet missing')
    })

    const response = updateMobileSubcategoryBudget({
      year: 2099,
      category: 'Food & Groceries',
      subcategoryName: 'Groceries',
      rowIndex: 42,
      monthUpdates: { 1: -200 },
    })

    expect(response).toEqual({
      success: false,
      error: 'Year sheet missing',
    })
  })
})
