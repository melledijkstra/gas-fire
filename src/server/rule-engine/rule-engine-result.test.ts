import { describe, expect, it } from 'vitest'
import { RuleEngineResult } from './rule-engine-result'
import type { ImportRule, PackedRuleEngineResult, RuleWarning } from './types'

describe('RuleEngineResult', () => {
  it('initializes with default values', () => {
    const result = new RuleEngineResult()

    expect(result.rulesCount).toBe(0)
    expect(result.warnings).toEqual([])
    expect(result.appliedRules).toEqual([])
    expect(result.removedHashes).toBeInstanceOf(Set)
    expect(result.removedHashes.size).toBe(0)
    expect(result.rowExcludedRule).toEqual({})
  })

  it('initializes with a specified rules count', () => {
    const result = new RuleEngineResult(5)

    expect(result.rulesCount).toBe(5)
  })

  it('packs into a serialize-safe PackedRuleEngineResult', () => {
    const result = new RuleEngineResult(2)
    const warning: RuleWarning = { ruleName: 'Rule 1', message: 'Warning message' }
    const rule: ImportRule = {
      ruleName: 'Rule 1',
      banks: ['All'],
      conditionColumn: 'desc',
      condition: 'EQUALS',
      action: 'EXCLUDE',
      stopProcessing: false,
      rulePhase: 'PRE_TRANSFORM',
    }

    result.warnings.push(warning)
    result.appliedRules.push(rule)
    result.removedHashes.add('hash-1')
    result.removedHashes.add('hash-2')
    result.rowExcludedRule['hash-1'] = 'Rule 1'

    const packed = result.pack()

    expect(packed.rulesCount).toBe(2)
    expect(packed.warnings).toEqual([warning])
    expect(packed.appliedRules).toEqual([rule])
    expect(Array.isArray(packed.removedHashes)).toBe(true)
    expect(packed.removedHashes).toEqual(['hash-1', 'hash-2'])
    expect(packed.rowExcludedRule).toEqual({ 'hash-1': 'Rule 1' })
  })

  it('unpacks a PackedRuleEngineResult into a RuleEngineResult instance', () => {
    const packed: PackedRuleEngineResult = {
      rulesCount: 3,
      warnings: [{ ruleName: 'Test', message: 'msg' }],
      appliedRules: [],
      removedHashes: ['hash-a', 'hash-b'],
      rowExcludedRule: { 'hash-a': 'Test' },
    }

    const unpacked = RuleEngineResult.unpack(packed)

    expect(unpacked).toBeInstanceOf(RuleEngineResult)
    expect(unpacked.rulesCount).toBe(3)
    expect(unpacked.warnings).toEqual([{ ruleName: 'Test', message: 'msg' }])
    expect(unpacked.removedHashes).toBeInstanceOf(Set)
    expect(unpacked.removedHashes.has('hash-a')).toBe(true)
    expect(unpacked.removedHashes.has('hash-b')).toBe(true)
    expect(unpacked.removedHashes.size).toBe(2)
    expect(unpacked.rowExcludedRule).toEqual({ 'hash-a': 'Test' })
  })

  it('preserves data over pack and unpack roundtrip', () => {
    const original = new RuleEngineResult(1)
    original.removedHashes.add('hash-xyz')
    original.rowExcludedRule['hash-xyz'] = 'Exclude Rule'

    const roundtripped = RuleEngineResult.unpack(original.pack())

    expect(roundtripped).toBeInstanceOf(RuleEngineResult)
    expect(roundtripped.rulesCount).toBe(original.rulesCount)
    expect(roundtripped.removedHashes).toEqual(original.removedHashes)
    expect(roundtripped.rowExcludedRule).toEqual(original.rowExcludedRule)
  })
})
