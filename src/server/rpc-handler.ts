import { Logger } from '@/common/logger'
import type { ServerResponse } from '@/common/types'

/**
 * Wraps an RPC function with standardized error handling and execution timing.
 */
export function withRpcHandler<TArgs extends unknown[], TReturn>(
  name: string,
  fn: (...args: TArgs) => ServerResponse<TReturn>,
): (...args: TArgs) => ServerResponse<TReturn> {
  return (...args: TArgs): ServerResponse<TReturn> => {
    try {
      Logger.time(name)
      return fn(...args)
    }
    catch (error) {
      Logger.error(error)
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }
    }
    finally {
      Logger.timeEnd(name)
    }
  }
}
