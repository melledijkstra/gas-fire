import type { ImportRule, RuleCondition, RulePhase, RuleWarning } from './types'
import { Table } from '@/common/table/Table'
import { FireTable } from '../table/FireTable'
import { Logger } from '@/common/logger'
import type { CellValue } from '@/common/types'

export interface RuleExecutionResult {
  excludedIndices: Set<number>
  appliedRules: ImportRule[]
  rowsAffectedCount: number
  warnings: RuleWarning[]
  excludedByRule: Map<number, string> // Maps row index to ruleName
}

/**
 * Filters rules by bank applicability and phase.
 */
function getApplicableRules(rules: ImportRule[], accountId: string, phase: RulePhase): ImportRule[] {
  return rules.filter((rule) => {
    if (rule.rulePhase !== phase) return false
    if (rule.banks.some(b => b.toLowerCase() === 'all')) return true
    return rule.banks.some(b => b.toLowerCase() === accountId.toLowerCase())
  })
}

/**
 * Evaluates a single condition.
 */
// eslint-disable-next-line complexity
function evaluateCondition(cellValue: string, condition: RuleCondition, conditionValue?: string): boolean {
  const value = cellValue?.toString() ?? ''

  switch (condition) {
    case 'NOT_EMPTY':
      return value.trim() !== ''
    case 'EQUALS':
      return value.toLowerCase() === (conditionValue?.toLowerCase() ?? '')
    case 'CONTAINS':
      return value.toLowerCase().includes((conditionValue?.toLowerCase() ?? ''))
    case 'NOT_CONTAINS':
      return !value.toLowerCase().includes((conditionValue?.toLowerCase() ?? ''))
    case 'REGEX':
      try {
        const regex = new RegExp(conditionValue ?? '', 'i')
        return regex.test(value)
      }
      catch {
        Logger.warn(`Invalid regex in rule: ${conditionValue}`)
        return false
      }
    case 'GREATER_THAN': {
      const numVal = Number.parseFloat(value)
      const target = Number.parseFloat(conditionValue ?? '0')
      return !Number.isNaN(numVal) && !Number.isNaN(target) && numVal > target
    }
    case 'LESS_THAN': {
      const numVal = Number.parseFloat(value)
      const target = Number.parseFloat(conditionValue ?? '0')
      return !Number.isNaN(numVal) && !Number.isNaN(target) && numVal < target
    }
    default:
      return false
  }
}

/**
 * Applies actions to a specific row array.
 * Mutates the row array if it's a SET/ADD/SUBTRACT action.
 */
function applyAction(
  row: CellValue[],
  targetColumnIndex: number,
  rule: ImportRule,
): void {
  if (targetColumnIndex === -1) return

  const currentValue = row[targetColumnIndex]?.toString() ?? ''

  switch (rule.action) {
    case 'SET':
      row[targetColumnIndex] = rule.actionValue ?? ''
      break
    case 'ADD': {
      const numVal = Number.parseFloat(currentValue) ?? 0
      const addVal = Number.parseFloat(rule.actionValue ?? '0')
      row[targetColumnIndex] = (numVal + addVal).toString()
      break
    }
    case 'SUBTRACT': {
      const numVal = Number.parseFloat(currentValue) ?? 0
      const subVal = Number.parseFloat(rule.actionValue ?? '0')
      row[targetColumnIndex] = (numVal - subVal).toString()
      break
    }
    case 'EXCLUDE':
      // Handled outside
      break
  }
}

/**
 * Applies rules to a single row.
 * Returns true if the row was affected by any rule.
 */
function applyRulesToRow(
  row: CellValue[],
  rowIndex: number,
  rules: ImportRule[],
  getColumnIndex: (colName: string) => number,
  result: RuleExecutionResult,
): boolean {
  let rowAffected = false

  for (const rule of rules) {
    const conditionColIndex = getColumnIndex(rule.conditionColumn)

    if (conditionColIndex === -1) {
      if (!result.warnings.some(w => w.ruleName === rule.ruleName)) {
        result.warnings.push({ ruleName: rule.ruleName, message: `Column '${rule.conditionColumn}' not found.` })
      }
      continue
    }

    const cellValue = row[conditionColIndex]?.toString() ?? ''
    const conditionMet = evaluateCondition(cellValue, rule.condition, rule.conditionValue)

    if (conditionMet) {
      rowAffected = true

      if (rule.action === 'EXCLUDE') {
        result.excludedIndices.add(rowIndex)
        result.excludedByRule.set(rowIndex, rule.ruleName)
        return true // Row is excluded, stop processing further rules for this row
      }

      const actionTargetIndex = getColumnIndex(rule?.actionColumn ?? '')
      if (actionTargetIndex === -1) {
        if (!result.warnings.some(w => w.ruleName === rule.ruleName)) {
          result.warnings.push({ ruleName: rule.ruleName, message: `Target column '${rule?.actionColumn ?? ''}' not found.` })
        }
      }
      else {
        applyAction(row, actionTargetIndex, rule)
      }

      result.appliedRules.push(rule)

      if (rule.stopProcessing) {
        break
      }
    }
  }

  return rowAffected
}

/**
 * Applies PRE_TRANSFORM rules to a raw Table.
 * Note: EXCLUDE rules don't remove the row from the Table directly in this function,
 * they just return the indices to be removed so the caller can handle it safely.
 */
export function applyPreTransformRules(
  table: Table,
  rules: ImportRule[],
  accountId: string,
): RuleExecutionResult {
  const applicableRules = getApplicableRules(rules, accountId, 'PRE_TRANSFORM')
  const result: RuleExecutionResult = {
    excludedIndices: new Set(),
    appliedRules: [],
    rowsAffectedCount: 0,
    warnings: [],
    excludedByRule: new Map(),
  }

  if (applicableRules.length === 0) return result

  const data = table.data
  const affectedRows = new Set<number>()
  const getColumnIndex = (name: string) => table.headers.indexOf(name)

  for (let i = 0; i < data.length; i++) {
    if (applyRulesToRow(data[i], i, applicableRules, getColumnIndex, result)) {
      affectedRows.add(i)
    }
  }

  result.rowsAffectedCount = affectedRows.size

  return result
}

/**
 * Applies POST_TRANSFORM rules to a FireTable.
 * Note: EXCLUDE rules don't remove the row from the FireTable directly in this function.
 */
export function applyPostTransformRules(
  fireTable: FireTable,
  rules: ImportRule[],
  accountId: string,
): RuleExecutionResult {
  const applicableRules = getApplicableRules(rules, accountId, 'POST_TRANSFORM')
  const result: RuleExecutionResult = {
    appliedRules: [],
    rowsAffectedCount: 0,
    warnings: [],
    excludedIndices: new Set(),
    excludedByRule: new Map(),
  }

  if (applicableRules.length === 0) return result

  const data = fireTable.data
  const affectedRows = new Set<number>()
  const getColumnIndex = (name: string) => fireTable.headers.indexOf(name)

  for (let i = 0; i < data.length; i++) {
    if (applyRulesToRow(data[i], i, applicableRules, getColumnIndex, result)) {
      affectedRows.add(i)
    }
  }

  result.rowsAffectedCount = affectedRows.size

  return result
}
