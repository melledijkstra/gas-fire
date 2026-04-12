import type { ImportRule, RuleWarning } from './types'
import { Table } from '../table/Table'
import { FireTable } from '../table/FireTable'
import { Logger } from '@/common/logger'

export interface RuleExecutionResult {
  excludedIndices: Set<number>
  rulesAppliedCount: number
  rowsAffectedCount: number
  warnings: RuleWarning[]
  excludedByRule: Map<number, string> // Maps row index to ruleName
}

/**
 * Filters rules by bank applicability and phase.
 */
function getApplicableRules(rules: ImportRule[], bank: string, phase: 'PRE_TRANSFORM' | 'POST_TRANSFORM'): ImportRule[] {
  return rules.filter((rule) => {
    if (rule.rulePhase !== phase) return false
    if (rule.banks.includes('All')) return true
    return rule.banks.includes(bank)
  })
}

/**
 * Evaluates a single condition.
 */
// eslint-disable-next-line complexity
function evaluateCondition(cellValue: string, condition: ImportRule['condition'], conditionValue?: string): boolean {
  const value = cellValue?.toString() || ''

  switch (condition) {
    case 'NOT_EMPTY':
      return value.trim() !== ''
    case 'EQUALS':
      return value.toLowerCase() === (conditionValue?.toLowerCase() || '')
    case 'CONTAINS':
      return value.toLowerCase().includes((conditionValue?.toLowerCase() || ''))
    case 'NOT_CONTAINS':
      return !value.toLowerCase().includes((conditionValue?.toLowerCase() || ''))
    case 'REGEX':
      try {
        const regex = new RegExp(conditionValue || '', 'i')
        return regex.test(value)
      }
      catch {
        Logger.warn(`Invalid regex in rule: ${conditionValue}`)
        return false
      }
    case 'GREATER_THAN': {
      const numVal = parseFloat(value)
      const target = parseFloat(conditionValue || '0')
      return !isNaN(numVal) && !isNaN(target) && numVal > target
    }
    case 'LESS_THAN': {
      const numVal = parseFloat(value)
      const target = parseFloat(conditionValue || '0')
      return !isNaN(numVal) && !isNaN(target) && numVal < target
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
  row: unknown[],
  targetColumnIndex: number,
  rule: ImportRule,
): void {
  if (targetColumnIndex === -1) return

  const currentValue = row[targetColumnIndex]?.toString() || ''

  switch (rule.action) {
    case 'SET':
      row[targetColumnIndex] = rule.actionValue || ''
      break
    case 'ADD': {
      const numVal = parseFloat(currentValue) || 0
      const addVal = parseFloat(rule.actionValue || '0')
      row[targetColumnIndex] = (numVal + addVal).toString()
      break
    }
    case 'SUBTRACT': {
      const numVal = parseFloat(currentValue) || 0
      const subVal = parseFloat(rule.actionValue || '0')
      row[targetColumnIndex] = (numVal - subVal).toString()
      break
    }
    case 'EXCLUDE':
      // Handled outside
      break
  }
}

/**
 * Applies PRE_TRANSFORM rules to a raw Table.
 * Note: EXCLUDE rules don't remove the row from the Table directly in this function,
 * they just return the indices to be removed so the caller can handle it safely.
 */
export function applyPreTransformRules(
  table: Table,
  headers: string[],
  rules: ImportRule[],
  bank: string,
): RuleExecutionResult {
  const applicableRules = getApplicableRules(rules, bank, 'PRE_TRANSFORM')
  const result: RuleExecutionResult = {
    excludedIndices: new Set(),
    rulesAppliedCount: 0,
    rowsAffectedCount: 0,
    warnings: [],
    excludedByRule: new Map(),
  }

  if (applicableRules.length === 0) return result

  const data = table.getData()
  let anyRulesApplied = false
  const affectedRows = new Set<number>()

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    let rowAffected = false

    for (const rule of applicableRules) {
      const conditionColIndex = headers.indexOf(rule.conditionColumn)

      if (conditionColIndex === -1) {
        if (!result.warnings.some(w => w.ruleName === rule.ruleName)) {
          result.warnings.push({ ruleName: rule.ruleName, message: `Column '${rule.conditionColumn}' not found in headers.` })
        }
        continue
      }

      const cellValue = String(row[conditionColIndex] ?? '')
      const conditionMet = evaluateCondition(cellValue, rule.condition, rule.conditionValue)

      if (conditionMet) {
        anyRulesApplied = true
        rowAffected = true

        if (rule.action === 'EXCLUDE') {
          result.excludedIndices.add(i)
          result.excludedByRule.set(i, rule.ruleName)
          break // Once excluded, no further rules needed for this row
        }
        else {
          const actionTargetIndex = headers.indexOf(rule.actionTarget)
          if (actionTargetIndex === -1) {
            if (!result.warnings.some(w => w.ruleName === rule.ruleName)) {
              result.warnings.push({ ruleName: rule.ruleName, message: `Target column '${rule.actionTarget}' not found in headers.` })
            }
          }
          else {
            applyAction(row, actionTargetIndex, rule)
          }
        }

        if (rule.stopProcessing) {
          break
        }
      }
    }

    if (rowAffected) affectedRows.add(i)
  }

  result.rulesAppliedCount = anyRulesApplied ? applicableRules.length : 0
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
  bank: string,
): RuleExecutionResult {
  const applicableRules = getApplicableRules(rules, bank, 'POST_TRANSFORM')
  const result: RuleExecutionResult = {
    excludedIndices: new Set(),
    rulesAppliedCount: 0,
    rowsAffectedCount: 0,
    warnings: [],
    excludedByRule: new Map(),
  }

  if (applicableRules.length === 0) return result

  const data = fireTable.getData()
  let anyRulesApplied = false
  const affectedRows = new Set<number>()

  for (let i = 0; i < data.length; i++) {
    const row = data[i]
    let rowAffected = false

    for (const rule of applicableRules) {
      // Cast safely since rule engine types uses string to allow any column names
      const conditionColIndex = FireTable.getFireColumnIndex(rule.conditionColumn as import('@/common/constants').FireColumn)

      if (conditionColIndex === -1) {
        if (!result.warnings.some(w => w.ruleName === rule.ruleName)) {
          result.warnings.push({ ruleName: rule.ruleName, message: `FIRE Column '${rule.conditionColumn}' not found.` })
        }
        continue
      }

      const cellValue = String(row[conditionColIndex] ?? '')
      const conditionMet = evaluateCondition(cellValue, rule.condition, rule.conditionValue)

      if (conditionMet) {
        anyRulesApplied = true
        rowAffected = true

        if (rule.action === 'EXCLUDE') {
          result.excludedIndices.add(i)
          result.excludedByRule.set(i, rule.ruleName)
          break
        }
        else {
          const actionTargetIndex = FireTable.getFireColumnIndex(rule.actionTarget as import('@/common/constants').FireColumn)
          if (actionTargetIndex === -1) {
            if (!result.warnings.some(w => w.ruleName === rule.ruleName)) {
              result.warnings.push({ ruleName: rule.ruleName, message: `FIRE Target column '${rule.actionTarget}' not found.` })
            }
          }
          else {
            applyAction(row, actionTargetIndex, rule)
          }
        }

        if (rule.stopProcessing) {
          break
        }
      }
    }

    if (rowAffected) affectedRows.add(i)
  }

  result.rulesAppliedCount = anyRulesApplied ? applicableRules.length : 0
  result.rowsAffectedCount = affectedRows.size

  return result
}
