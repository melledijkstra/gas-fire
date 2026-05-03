import { Table } from '@/common/table/Table'
import { describe, expect, it } from 'vitest'
import { RuleProcessor } from './rule-processor'
import type { ImportRule } from './types'

describe('RuleProcessor Regex Flags', () => {
  const headers = ['description']

  it('should support case-insensitive regex by default', () => {
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

    const processor = new RuleProcessor(rules)
    const result = processor.applyPreTransformRules(table, 'TestBank')
    expect(result.excludedIndices.has(0)).toBe(true)
    expect(result.excludedIndices.has(1)).toBe(true)
  })

  it('should support explicit regex flags /pattern/flags', () => {
    const data = [['UBER'], ['uber']]
    const table = new Table(headers, data)

    // Case sensitive regex
    const rules: ImportRule[] = [{
      ruleName: 'Match Uber Case Sensitive',
      banks: ['All'],
      conditionColumn: 'description',
      condition: 'REGEX',
      conditionValue: '/uber/',
      action: 'EXCLUDE',
      actionColumn: '',
      stopProcessing: false,
      rulePhase: 'PRE_TRANSFORM',
    }]

    const processor = new RuleProcessor(rules)
    const result = processor.applyPreTransformRules(table, 'TestBank')

    // With current implementation, it will look for literal "/uber/" and fail both
    // After my changes, it should match "uber" but not "UBER" (no 'i' flag)
    expect(result.excludedIndices.has(0)).toBe(false)
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

  it('should fallback to default "i" flag if not in /pattern/flags format', () => {
    const data = [['UBER']]
    const table = new Table(headers, data)
    const rules: ImportRule[] = [{
      ruleName: 'Match Uber',
      banks: ['All'],
      conditionColumn: 'description',
      condition: 'REGEX',
      conditionValue: 'uber', // no slashes
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
