import type {
  MobileDashboardData,
  MobileSubcategoryBudgetUpdatePayload,
  MobileSubcategoryBudgetUpdateResult,
  MobileTransactionsPage,
  MobileTransactionUpdatePayload,
  ServerResponse,
} from '@/common/types'
import { YMYLSpreadsheet } from '../globals'
import { withRpcHandler } from '../rpc-handler'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import {
  buildMobileDashboardData,
  buildMobileTransactionsPage,
  DEFAULT_TRANSACTION_PAGE_SIZE,
  updateSubcategoryBudgetInSheet,
  updateTransactionInSheet,
} from './service'

export const getMobileDashboardData = withRpcHandler(
  'getMobileDashboardData',
  (): ServerResponse<MobileDashboardData> => {
    const ymylSheet = new YMYLSheet()
    return {
      success: true,
      data: buildMobileDashboardData(YMYLSpreadsheet, ymylSheet),
    }
  },
)

export const getMobileTransactionsPage = withRpcHandler(
  'getMobileTransactionsPage',
  (
    offset: number,
    limit: number = DEFAULT_TRANSACTION_PAGE_SIZE,
  ): ServerResponse<MobileTransactionsPage> => {
    const ymylSheet = new YMYLSheet()
    return {
      success: true,
      data: buildMobileTransactionsPage(YMYLSpreadsheet, ymylSheet, offset, limit),
    }
  },
)

export const updateMobileTransaction = withRpcHandler(
  'updateMobileTransaction',
  (payload: MobileTransactionUpdatePayload): ServerResponse<{ rowIndex: number }> => {
    const ymylSheet = new YMYLSheet()
    const result = updateTransactionInSheet(ymylSheet, payload)
    YMYLSheet.resetCache()
    return {
      success: true,
      data: result,
    }
  },
)

export const updateMobileSubcategoryBudget = withRpcHandler(
  'updateMobileSubcategoryBudget',
  (
    payload: MobileSubcategoryBudgetUpdatePayload,
  ): ServerResponse<MobileSubcategoryBudgetUpdateResult> => {
    return {
      success: true,
      data: updateSubcategoryBudgetInSheet(YMYLSpreadsheet, payload),
    }
  },
)
