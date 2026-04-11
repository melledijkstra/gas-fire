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

export type RulePhase = 'PRE_TRANSFORM' | 'POST_TRANSFORM'

export interface ImportRule {
  ruleName: string
  banks: string[] // Array of bank names or ["All"]
  conditionColumn: string
  condition: RuleCondition
  conditionValue?: string
  action: RuleAction
  actionTarget: string
  actionValue?: string
  stopProcessing: boolean
  rulePhase: RulePhase
}

export interface RuleWarning {
  ruleName: string
  message: string
}
