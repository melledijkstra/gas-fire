import type {
  MobileDashboardData,
  MobileTransactionUpdatePayload,
  ServerResponse,
} from '@/common/types'
import { YMYLSpreadsheet } from '../globals'
import { withRpcHandler } from '../rpc-handler'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import { buildMobileDashboardData, updateTransactionInSheet } from './service'

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
