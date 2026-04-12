import { FIRE_COLUMNS } from '@/common/constants'
import type { Table } from '../table/Table'
import type { ImportRule, RowRuleResult, RuleProcessingResult, RuleWarning } from './types'
import { evaluateCondition } from './conditions'
import { applyAction } from './actions'

type ColumnResolver = (columnName: string) => number

/**
 * Creates a column resolver for raw CSV headers.
 * Matches column names exactly (case-sensitive, as they come from the CSV header).
 */
export function createRawColumnResolver(headers: string[]): ColumnResolver {
  return (columnName: string) => headers.indexOf(columnName)
}

/**
 * Creates a column resolver for FIRE column names.
 * Matches case-insensitively against the standard FIRE_COLUMNS.
 */
export function createFireColumnResolver(): ColumnResolver {
  return (columnName: string) => {
    const lower = columnName.toLowerCase()
    return FIRE_COLUMNS.findIndex(col => col === lower)
  }
}

function createEmptyRowResult(): RowRuleResult {
  return {
    excluded: false,
    matchedRules: [],
    modifications: {},
  }
}

/**
 * Applies import rules to each row of a table, evaluating conditions
 * and executing actions.
 *
 * @param table - The table to process (Table for PRE_TRANSFORM, FireTable for POST_TRANSFORM)
 * @param rules - The rules to apply, in priority order (by rowIndex)
 * @param resolveColumn - Function to resolve column names to 0-based indices
 * @param dryRun - If true, track results without mutating the table
 * @returns Processing result with per-row outcomes and summary counts
 */
export function processRules(
  table: Table,
  rules: ImportRule[],
  resolveColumn: ColumnResolver,
  dryRun: boolean,
): RuleProcessingResult {
  const data = table.getData()
  const rowResults: RowRuleResult[] = []
  const warnings: RuleWarning[] = []
  const appliedRuleNames = new Set<string>()
  let rowsExcluded = 0
  let rowsModified = 0

  for (const row of data) {
    const rowResult = createEmptyRowResult()
    let wasModified = false

    for (const rule of rules) {
      const conditionColIndex = resolveColumn(rule.conditionColumn)
      if (conditionColIndex === -1) {
        warnings.push({
          ruleName: rule.ruleName,
          rowIndex: rule.rowIndex,
          message: `Column "${rule.conditionColumn}" not found`,
        })
        continue
      }

      const cellValue = row[conditionColIndex]

      if (!evaluateCondition(cellValue, rule.condition, rule.conditionValue)) {
        continue
      }

      // Condition matched
      appliedRuleNames.add(rule.ruleName)

      if (rule.action === 'EXCLUDE') {
        rowResult.excluded = true
        rowResult.excludedByRule = rule.ruleName
        rowResult.matchedRules.push({
          ruleName: rule.ruleName,
          action: rule.action,
        })
        break
      }

      const actionColumn = rule.actionColumn ?? rule.conditionColumn
      const actionColIndex = resolveColumn(actionColumn)
      if (actionColIndex === -1) {
        warnings.push({
          ruleName: rule.ruleName,
          rowIndex: rule.rowIndex,
          message: `Action column "${actionColumn}" not found`,
        })
        continue
      }

      const currentValue = row[actionColIndex]
      const newValue = applyAction(currentValue, rule.action, rule.actionValue)

      rowResult.matchedRules.push({
        ruleName: rule.ruleName,
        action: rule.action,
        actionColumn,
        actionValue: rule.actionValue,
      })
      rowResult.modifications[actionColumn] = newValue

      if (!dryRun) {
        row[actionColIndex] = newValue
      }

      wasModified = true

      if (rule.stopProcessing) {
        break
      }
    }

    if (rowResult.excluded) {
      rowsExcluded++
    }
    else if (wasModified) {
      rowsModified++
    }

    rowResults.push(rowResult)
  }

  return {
    rowResults,
    rulesLoaded: rules.length,
    rulesApplied: appliedRuleNames.size,
    rowsExcluded,
    rowsModified,
    warnings,
  }
}
