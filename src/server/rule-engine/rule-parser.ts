import { slugify } from '@/common/helpers'
import type { ImportRule, RuleWarning, RuleCondition, RuleAction, RulePhase } from './types'

const VALID_CONDITIONS: Set<RuleCondition> = new Set([
  'REGEX', 'CONTAINS', 'EQUALS', 'NOT_EMPTY', 'NOT_CONTAINS', 'GREATER_THAN', 'LESS_THAN',
])

const VALID_ACTIONS: Set<RuleAction> = new Set(['EXCLUDE', 'SET', 'SUBTRACT', 'SUBTRACT_COLUMN', 'ADD', 'ADD_COLUMN'])
const VALID_PHASES: Set<RulePhase> = new Set(['PRE_TRANSFORM', 'POST_TRANSFORM'])

export interface ParseResult {
  rules: ImportRule[]
  warnings: RuleWarning[]
}

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
 * 6: Action Column
 * 7: Action Value
 * 8: Stop Processing?
 * 9: Rule Phase
 */
// eslint-disable-next-line complexity
export function parseRulesByAccount(rows: string[][], accountId: string): ParseResult {
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
    ] = row.map(cell => cell?.trim() ?? '')

    const ruleName = ruleNameRaw || `Rule at row ${i + 2}` // +2 because row 1 is header

    let banks: string[] = []
    if (banksRaw) {
      banks = banksRaw.split(',').map(b => b.trim()).filter(b => b.length > 0).map(slugify)
    }

    if (!banks.includes('all') && !banks.includes(accountId)) {
      // This rule does not apply to the current account, so we can skip it without a warning.
      continue
    }

    if (!ruleNameRaw) {
      warnings.push({ ruleName, message: `No rule name provided, defaulting to "${ruleName}".` })
    }

    if (banks.length === 0) {
      warnings.push({ ruleName, message: 'At least one bank must be specified, or "All".' })
      continue
    }

    if (!conditionColumnRaw) {
      warnings.push({ ruleName, message: 'Condition Column is required.' })
      continue
    }

    if (!VALID_CONDITIONS.has(conditionRaw as RuleCondition)) {
      warnings.push({ ruleName, message: `Invalid condition: "${conditionRaw}".` })
      continue
    }

    if (!VALID_ACTIONS.has(actionRaw as RuleAction)) {
      warnings.push({ ruleName, message: `Invalid action: "${actionRaw}".` })
      continue
    }

    if (!VALID_PHASES.has(rulePhaseRaw as RulePhase)) {
      warnings.push({ ruleName, message: `Invalid rule phase: "${rulePhaseRaw}". Must be one of ${Array.from(VALID_PHASES).join(', ')}` })
      continue
    }

    const condition = conditionRaw as RuleCondition
    const action = actionRaw as RuleAction

    // Validation for condition values
    if (condition !== 'NOT_EMPTY' && !conditionValueRaw) {
      warnings.push({ ruleName, message: `Condition value is required for condition "${condition}".` })
      continue
    }

    // Validation for action columns and values
    if ((action === 'SET' || action === 'SUBTRACT' || action === 'ADD') && (!actionTargetRaw || !actionValueRaw)) {
      warnings.push({ ruleName, message: `Action Column and Action Value are required for ${action} action.` })
      continue
    }

    if ((action === 'SUBTRACT_COLUMN' || action === 'ADD_COLUMN') && (!actionTargetRaw || !actionValueRaw)) {
      warnings.push({ ruleName, message: `Action Column and Action Value are required for ${action} action.` })
      continue
    }

    if (action === 'EXCLUDE' && !actionTargetRaw) {
      // Allow EXCLUDE to not have an action column if it just implies removing the row.
      // We can default actionColumn to empty string or 'ROW' internally.
    }
    else if (action !== 'EXCLUDE' && !actionTargetRaw) {
      warnings.push({ ruleName, message: `Action Column is required for action "${action}".` })
      continue
    }

    const stopProcessing = stopProcessingRaw.toLowerCase() === 'true' || stopProcessingRaw === 'TRUE'

    rules.push({
      ruleName,
      banks,
      conditionColumn: conditionColumnRaw,
      condition,
      conditionValue: conditionValueRaw,
      action,
      actionColumn: actionTargetRaw ?? '',
      actionValue: actionValueRaw,
      stopProcessing,
      rulePhase: rulePhaseRaw as RulePhase,
    })
  }

  return { rules, warnings }
}
