import type { CellValue } from '../table/types'

export type RuleCondition
  = 'REGEX'
    | 'CONTAINS'
    | 'EQUALS'
    | 'NOT_EMPTY'
    | 'NOT_CONTAINS'
    | 'GREATER_THAN'
    | 'LESS_THAN'

export type RuleAction
  = 'EXCLUDE'
    | 'SET'
    | 'SUBTRACT'
    | 'ADD'

export type RulePhase
  = 'PRE_TRANSFORM'
    | 'POST_TRANSFORM'

export interface ImportRule {
  ruleName: string
  banks: string[]
  conditionColumn: string
  condition: RuleCondition
  conditionValue?: string
  action: RuleAction
  actionColumn?: string
  actionValue?: string
  stopProcessing: boolean
  rulePhase: RulePhase
  rowIndex: number
}

export interface RuleWarning {
  ruleName: string
  rowIndex: number
  message: string
}

export interface RuleMatch {
  ruleName: string
  action: RuleAction
  actionColumn?: string
  actionValue?: string
}

export interface RowRuleResult {
  excluded: boolean
  excludedByRule?: string
  matchedRules: RuleMatch[]
  modifications: Record<string, CellValue>
}

export interface RuleProcessingResult {
  rowResults: RowRuleResult[]
  rulesLoaded: number
  rulesApplied: number
  rowsExcluded: number
  rowsModified: number
  warnings: RuleWarning[]
}

export const VALID_CONDITIONS: readonly RuleCondition[] = [
  'REGEX', 'CONTAINS', 'EQUALS', 'NOT_EMPTY', 'NOT_CONTAINS', 'GREATER_THAN', 'LESS_THAN',
] as const

export const VALID_ACTIONS: readonly RuleAction[] = [
  'EXCLUDE', 'SET', 'SUBTRACT', 'ADD',
] as const

export const VALID_PHASES: readonly RulePhase[] = [
  'PRE_TRANSFORM', 'POST_TRANSFORM',
] as const

/** Conditions that require a conditionValue to be provided. */
export const CONDITIONS_REQUIRING_VALUE: readonly RuleCondition[] = [
  'REGEX', 'CONTAINS', 'EQUALS', 'NOT_CONTAINS', 'GREATER_THAN', 'LESS_THAN',
] as const

/** Actions that require an actionValue to be provided. */
export const ACTIONS_REQUIRING_VALUE: readonly RuleAction[] = [
  'SET', 'ADD', 'SUBTRACT',
] as const

/** Actions that require a numeric actionValue. */
export const NUMERIC_ACTIONS: readonly RuleAction[] = [
  'ADD', 'SUBTRACT',
] as const
