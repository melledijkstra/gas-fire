import type { CellValue } from '../table/types'
import type { RuleAction } from './types'

/**
 * Applies a rule action to a cell value.
 *
 * For EXCLUDE, the caller is responsible for marking the row as excluded;
 * this function returns the current value unchanged.
 *
 * @param currentValue - The current cell value
 * @param action - The action to apply
 * @param actionValue - The value to use for the action
 * @returns The new cell value after applying the action
 */
export function applyAction(
  currentValue: CellValue,
  action: RuleAction,
  actionValue?: string,
): CellValue {
  switch (action) {
    case 'EXCLUDE':
      return currentValue

    case 'SET':
      return actionValue ?? null

    case 'ADD': {
      const current = Number(currentValue ?? 0)
      const addend = Number(actionValue)
      if (Number.isNaN(current) || Number.isNaN(addend)) return currentValue
      return current + addend
    }

    case 'SUBTRACT': {
      const current = Number(currentValue ?? 0)
      const subtrahend = Number(actionValue)
      if (Number.isNaN(current) || Number.isNaN(subtrahend)) return currentValue
      return current - subtrahend
    }

    default:
      return currentValue
  }
}
