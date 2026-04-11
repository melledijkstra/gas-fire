import type { ImportRule, RuleWarning, RuleCondition, RuleAction, RulePhase } from './types'

export interface ParseResult {
  rules: ImportRule[]
  warnings: RuleWarning[]
}

const VALID_CONDITIONS: RuleCondition[] = [
  'REGEX', 'CONTAINS', 'EQUALS', 'NOT_EMPTY', 'NOT_CONTAINS', 'GREATER_THAN', 'LESS_THAN',
]

const VALID_ACTIONS: RuleAction[] = ['EXCLUDE', 'SET', 'SUBTRACT', 'ADD']
const VALID_PHASES: RulePhase[] = ['PRE_TRANSFORM', 'POST_TRANSFORM']

/**
 * Parses raw string rows from the Google Sheet into structured ImportRules.
 * Validates the rules and generates warnings for any invalid rows.
 *
 * Expected columns:
 * 0: Rule Name
 * 1: Bank(s)
 * 2: Condition Column
 * 3: Condition
 * 4: Condition Value
 * 5: Action
 * 6: Action Target
 * 7: Action Value
 * 8: Stop Processing?
 * 9: Rule Phase
 */
// eslint-disable-next-line complexity
export function parseRules(rows: string[][]): ParseResult {
  const rules: ImportRule[] = []
  const warnings: RuleWarning[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    // Skip completely empty rows
    if (row.every(cell => !cell || cell.trim() === '')) {
      continue
    }

    const [
      ruleNameRaw,
      banksRaw,
      conditionColumnRaw,
      conditionRaw,
      conditionValueRaw,
      actionRaw,
      actionTargetRaw,
      actionValueRaw,
      stopProcessingRaw,
      rulePhaseRaw,
    ] = row.map(cell => cell?.trim() || '')

    const ruleName = ruleNameRaw || `Rule at row ${i + 2}` // +2 because row 1 is header

    if (!conditionColumnRaw) {
      warnings.push({ ruleName, message: 'Condition Column is required.' })
      continue
    }

    if (!VALID_CONDITIONS.includes(conditionRaw as RuleCondition)) {
      warnings.push({ ruleName, message: `Invalid condition: "${conditionRaw}".` })
      continue
    }

    if (!VALID_ACTIONS.includes(actionRaw as RuleAction)) {
      warnings.push({ ruleName, message: `Invalid action: "${actionRaw}".` })
      continue
    }

    if (!VALID_PHASES.includes(rulePhaseRaw as RulePhase)) {
      warnings.push({ ruleName, message: `Invalid rule phase: "${rulePhaseRaw}". Must be PRE_TRANSFORM or POST_TRANSFORM.` })
      continue
    }

    const condition = conditionRaw as RuleCondition
    const action = actionRaw as RuleAction

    // Validation for condition values
    if (condition !== 'NOT_EMPTY' && !conditionValueRaw) {
      warnings.push({ ruleName, message: `Condition value is required for condition "${condition}".` })
      continue
    }

    // Validation for action targets and values
    if (action === 'SET' && (!actionTargetRaw || !actionValueRaw)) {
      warnings.push({ ruleName, message: 'Action Target and Action Value are required for SET action.' })
      continue
    }

    if (action === 'EXCLUDE' && !actionTargetRaw) {
      // Allow EXCLUDE to not have an action target if it just implies removing the row.
      // We can default actionTarget to empty string or 'ROW' internally.
    }
    else if (action !== 'EXCLUDE' && !actionTargetRaw) {
      warnings.push({ ruleName, message: `Action Target is required for action "${action}".` })
      continue
    }

    let banks = ['All']
    if (banksRaw && banksRaw.toLowerCase() !== 'all') {
      banks = banksRaw.split(',').map(b => b.trim()).filter(b => b.length > 0)
    }

    const stopProcessing = stopProcessingRaw.toLowerCase() === 'true' || stopProcessingRaw === 'TRUE'

    rules.push({
      ruleName,
      banks,
      conditionColumn: conditionColumnRaw,
      condition,
      conditionValue: conditionValueRaw,
      action,
      actionTarget: actionTargetRaw || '',
      actionValue: actionValueRaw,
      stopProcessing,
      rulePhase: rulePhaseRaw as RulePhase,
    })
  }

  return { rules, warnings }
}
