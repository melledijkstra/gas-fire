import { Logger } from '@/common/logger'

/**
 * Wraps a pipeline function with standardised error handling and logging.
 */
export function withLogger(
  _target: unknown,
  propertyKey: string,
  descriptor: PropertyDescriptor,
): PropertyDescriptor {
  const originalMethod = descriptor.value
  descriptor.value = function (this: unknown, ...args: unknown[]) {
    Logger.time(propertyKey)
    try {
      return originalMethod.apply(this, args)
    }
    finally {
      Logger.timeEnd(propertyKey)
    }
  }
  return descriptor
}
