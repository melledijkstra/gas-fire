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
    const result = originalMethod.apply(this, args)
    Logger.timeEnd(propertyKey)
    return result
  }
  return descriptor
}
