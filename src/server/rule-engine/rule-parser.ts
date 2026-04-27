import { slugify } from '@/common/helpers'
import type { ImportRule, RuleWarning, RuleCondition, RuleAction, RulePhase } from './types'
import { withLogger } from '@/common/decorators'

const VALID_CONDITIONS: Set<RuleCondition> = new Set([
  'REGEX', 'CONTAINS', 'EQUALS', 'NOT_EMPTY', 'NOT_CONTAINS', 'GREATER_THAN', 'LESS_THAN',
])

const VALID_ACTIONS: Set<RuleAction> = new Set(['EXCLUDE', 'SET', 'SUBTRACT', 'SUBTRACT_COLUMN', 'ADD', 'ADD_COLUMN'])
const VALID_PHASES: Set<RulePhase> = new Set(['PRE_TRANSFORM', 'POST_TRANSFORM'])

export interface ParseResult {
  rules: ImportRule[]
  warnings: RuleWarning[]
}

export class RuleParser {
  rules: ImportRule[] = []
  warnings: RuleWarning[] = []

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
  @withLogger
  parseRulesByAccount(rows: string[][], accountId: string): ParseResult {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]

      // Skip completely empty rows
      if (row.every(cell => !cell || cell.trim() === '')) {
        continue
      }

      const ruleNameRaw = row?.[0].trim()
      const ruleName = ruleNameRaw || `Rule at row ${i + 2}` // +2 because row 1 is header

      if (!ruleNameRaw) {
        this.warnings.push({ ruleName, message: `No rule name provided, defaulting to "${ruleName}".` })
      }

      const rule = this.parseRuleRow(row, ruleName, accountId)

      if (rule) {
        this.rules.push(rule)
      }
    }

    return { rules: this.rules, warnings: this.warnings }
  }

  // eslint-disable-next-line complexity
  private parseRuleRow(row: string[], ruleName: string, accountId?: string): ImportRule | undefined {
    const [
      _ruleNameRaw,
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

    const banks = this.parseBanks(banksRaw)

    if (!banks || banks?.length === 0) {
      // At least a single bank or "all" should be set for a rule to be valid
      this.warnings.push({ ruleName, message: 'At least one bank must be specified, or "All".' })
      return
    }

    if (!this.validateBanks(banks, accountId)) {
      // This rule does not apply to the current account, neither applies to all banks
      // we can skip it without a warning.
      return
    }

    if (!conditionColumnRaw) {
      this.warnings.push({ ruleName, message: 'Condition Column is required.' })
      return
    }

    if (!VALID_CONDITIONS.has(conditionRaw as RuleCondition)) {
      this.warnings.push({ ruleName, message: `Invalid condition: "${conditionRaw}".` })
      return
    }

    if (!VALID_ACTIONS.has(actionRaw as RuleAction)) {
      this.warnings.push({ ruleName, message: `Invalid action: "${actionRaw}".` })
      return
    }

    if (!VALID_PHASES.has(rulePhaseRaw as RulePhase)) {
      this.warnings.push({ ruleName, message: `Invalid rule phase: "${rulePhaseRaw}". Must be one of ${Array.from(VALID_PHASES).join(', ')}` })
      return
    }

    const condition = conditionRaw as RuleCondition
    const action = actionRaw as RuleAction

    // Validation for condition values
    if (condition !== 'NOT_EMPTY' && !conditionValueRaw) {
      this.warnings.push({ ruleName, message: `Condition value is required for condition "${condition}".` })
      return
    }

    // Validation for action columns and values
    if ((action === 'SET' || action === 'SUBTRACT' || action === 'ADD') && (!actionTargetRaw || !actionValueRaw)) {
      this.warnings.push({ ruleName, message: `Action Column and Action Value are required for ${action} action.` })
      return
    }

    if ((action === 'SUBTRACT_COLUMN' || action === 'ADD_COLUMN') && (!actionTargetRaw || !actionValueRaw)) {
      this.warnings.push({ ruleName, message: `Action Column and Action Value are required for ${action} action.` })
      return
    }

    if (action === 'EXCLUDE' && !actionTargetRaw) {
      // Allow EXCLUDE to not have an action column if it just implies removing the row.
      // We can default actionColumn to empty string or 'ROW' internally.
    }
    else if (action !== 'EXCLUDE' && !actionTargetRaw) {
      this.warnings.push({ ruleName, message: `Action Column is required for action "${action}".` })
      return
    }

    const stopProcessing = stopProcessingRaw.toLowerCase() === 'true'

    return {
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
    }
  }

  private validateBanks(banks: string[], accountId?: string): boolean {
    if (banks.includes('all')) {
      return true
    }

    // if an account is specified, then make sure it is in the list of included banks
    return !!accountId
      && banks.includes(accountId)
  }

  private parseBanks(banksRaw: string): string[] {
    if (banksRaw) {
      return banksRaw.split(',').map(b => b.trim()).filter(b => b.length > 0).map(slugify)
    }

    return []
  }
}
