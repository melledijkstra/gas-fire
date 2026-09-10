import type { IPackable } from '@/common/types'
import type { ImportRule, PackedRuleEngineResult, RuleWarning } from './types'

export class RuleEngineResult implements IPackable<PackedRuleEngineResult> {
  warnings: RuleWarning[] = []
  rulesCount: number
  appliedRules: ImportRule[] = []
  removedHashes: Set<string> = new Set<string>()
  // maps transaction hash to the name of the rule that caused it to be excluded
  rowExcludedRule: Record<string, string> = {}

  constructor(rulesCount = 0) {
    this.rulesCount = rulesCount
  }

  /**
   * converts the result to a serialize-safe object format (PackedRuleEngineResult).
   */
  pack(): PackedRuleEngineResult {
    return {
      warnings: this.warnings,
      rulesCount: this.rulesCount,
      appliedRules: this.appliedRules,
      removedHashes: Array.from(this.removedHashes),
      rowExcludedRule: this.rowExcludedRule,
    }
  }

  /**
   * reconstructs a RuleEngineResult instance from a PackedRuleEngineResult object.
   */
  static unpack(packed: PackedRuleEngineResult): RuleEngineResult {
    const result = new RuleEngineResult(packed.rulesCount)
    result.warnings = [...packed.warnings]
    result.appliedRules = [...packed.appliedRules]
    result.removedHashes = new Set(packed.removedHashes)
    result.rowExcludedRule = { ...packed.rowExcludedRule }
    return result
  }
}
