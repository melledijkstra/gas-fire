export type RuleCondition
  = | 'REGEX'
    | 'CONTAINS'
    | 'EQUALS'
    | 'NOT_EMPTY'
    | 'NOT_CONTAINS'
    | 'GREATER_THAN'
    | 'LESS_THAN'

export type RuleAction
  = | 'EXCLUDE'
    | 'SET'
    | 'SUBTRACT'
    | 'ADD'

export type RulePhase
  = | 'PRE_TRANSFORM'
    | 'POST_TRANSFORM'

export interface ImportRule {
  ruleName: string
  banks: string[] // Array of bank names or ["All"]
  conditionColumn: string
  condition: RuleCondition
  conditionValue?: string
  action: RuleAction
  actionColumn?: string
  actionValue?: string
  stopProcessing: boolean
  rulePhase: RulePhase
}

export interface RuleWarning {
  ruleName: string
  message: string
}

export interface RuleEngineResult {
  warnings: RuleWarning[]
  rulesCount: number
  appliedRules: ImportRule[]
  removedHashes: Set<string>
  // maps transaction hash to the name of the rule that caused it to be excluded
  rowExcludedRule: Record<string, string>
}

// S prefix is for serialize safe types, which can be safely sent over the wire without losing type information
export interface PackedRuleEngineResult {
  warnings: RuleEngineResult['warnings']
  rulesCount: RuleEngineResult['rulesCount']
  appliedRules: RuleEngineResult['appliedRules']
  removedHashes: string[] // Set<string> converted to array for serialization
  rowExcludedRule: Record<string, string>
}
