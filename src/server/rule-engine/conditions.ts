import type { CellValue } from '../table/types'
import type { RuleCondition } from './types'

function toStringValue(cellValue: CellValue): string {
  return cellValue instanceof Date
    ? cellValue.toISOString()
    : String(cellValue ?? '')
}

function compareNumeric(
  cellValue: CellValue,
  conditionValue: string | undefined,
  comparator: (a: number, b: number) => boolean,
): boolean {
  const numCell = Number(cellValue)
  const numCondition = Number(conditionValue)
  if (Number.isNaN(numCell) || Number.isNaN(numCondition)) return false
  return comparator(numCell, numCondition)
}

function matchesRegex(stringValue: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(stringValue)
  }
  catch {
    return false
  }
}

type ConditionHandler = (stringValue: string, cellValue: CellValue, conditionValue?: string) => boolean

const CONDITION_HANDLERS: Record<RuleCondition, ConditionHandler> = {
  CONTAINS: (s, _c, v) => s.toLowerCase().includes(v!.toLowerCase()),
  NOT_CONTAINS: (s, _c, v) => !s.toLowerCase().includes(v!.toLowerCase()),
  EQUALS: (s, _c, v) => s.toLowerCase() === v!.toLowerCase(),
  REGEX: (s, _c, v) => matchesRegex(s, v!),
  NOT_EMPTY: (s, c) => c !== null && c !== undefined && s !== '',
  GREATER_THAN: (_s, c, v) => compareNumeric(c, v, (a, b) => a > b),
  LESS_THAN: (_s, c, v) => compareNumeric(c, v, (a, b) => a < b),
}

/**
 * Evaluates a condition against a cell value.
 *
 * @param cellValue - The value from the table cell to evaluate
 * @param condition - The condition type to check
 * @param conditionValue - The value to compare against (not required for NOT_EMPTY)
 * @returns Whether the condition is met
 */
export function evaluateCondition(
  cellValue: CellValue,
  condition: RuleCondition,
  conditionValue?: string,
): boolean {
  const handler = CONDITION_HANDLERS[condition]
  if (!handler) return false
  return handler(toStringValue(cellValue), cellValue, conditionValue)
}
