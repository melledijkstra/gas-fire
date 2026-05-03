import { Table } from '@/common/table/Table'
import { describe, expect, it } from 'vitest'
import { RuleProcessor } from './rule-processor'
import type { ImportRule } from './types'

describe('RuleProcessor Regex Flags', () => {
  const headers = ['description']
  const data = [['UBER'], ['uber']]
  const table = new Table(headers, data)

  const rules: ImportRule[] = [{
    ruleName: 'Match Uber',
    banks: ['All'],
    conditionColumn: 'description',
    condition: 'REGEX',
    conditionValue: 'uber',
    action: 'EXCLUDE',
    actionColumn: '',
    stopProcessing: false,
    rulePhase: 'PRE_TRANSFORM',
  }]

  it('should not use any flags by default (case-sensitive regex)', () => {
    const processor = new RuleProcessor(rules)
    const result = processor.applyPreTransformRules(table, 'TestBank')
    expect(result.excludedIndices.has(0)).toBe(false)
    expect(result.excludedIndices.has(1)).toBe(true)
  })

  it('should support explicit regex flags /pattern/flags', () => {
    const sensitiveRules = [
      {
        ...rules[0],
        conditionValue: '/uber/i', // case-insensitive match
      },
    ]

    const processor = new RuleProcessor(sensitiveRules)
    const result = processor.applyPreTransformRules(table, 'TestBank')

    // it should match both 'UBER' and 'uber' due to the 'i' flag
    expect(result.excludedIndices.has(0)).toBe(true)
    expect(result.excludedIndices.has(1)).toBe(true)
  })

  it('should support multiple flags /pattern/flags', () => {
    const data = [['line1\nline2']]
    const table = new Table(headers, data)

    // Match across multiple lines with 's' flag
    const rules: ImportRule[] = [{
      ruleName: 'Multi-line match',
      banks: ['All'],
      conditionColumn: 'description',
      condition: 'REGEX',
      conditionValue: '/line1.*line2/s',
      action: 'EXCLUDE',
      actionColumn: '',
      stopProcessing: false,
      rulePhase: 'PRE_TRANSFORM',
    }]

    const processor = new RuleProcessor(rules)
    const result = processor.applyPreTransformRules(table, 'TestBank')

    expect(result.excludedIndices.has(0)).toBe(true)
  })

  it('can parse multiple regex flags', () => {
    const data = [['line1\nuber']]
    const table = new Table(headers, data)

    const rules: ImportRule[] = [{
      ruleName: 'Multi-line case-insensitive match',
      banks: ['All'],
      conditionColumn: 'description',
      condition: 'REGEX',
      // This should match 'UBER' even with the 'i' flag, and also work across lines with the 's' flag
      conditionValue: '/line1.*uber/sig',
      action: 'EXCLUDE',
      actionColumn: '',
      stopProcessing: false,
      rulePhase: 'PRE_TRANSFORM',
    }]

    const processor = new RuleProcessor(rules)
    const result = processor.applyPreTransformRules(table, 'TestBank')

    expect(result.excludedIndices.has(0)).toBe(true)
  })
})
