import { describe, it, expect } from 'vitest'
import { parseRules } from './rule-parser'

describe('parseRules', () => {
  it('should successfully parse a valid rule', () => {
    const rows = [
      [
        'Test Rule',
        'Bank A',
        'description',
        'CONTAINS',
        'uber',
        'SET',
        'category',
        'Transport',
        'true',
        'POST_TRANSFORM',
      ],
    ]

    const result = parseRules(rows)

    expect(result.warnings).toHaveLength(0)
    expect(result.rules).toHaveLength(1)
    expect(result.rules[0]).toEqual({
      ruleName: 'Test Rule',
      banks: ['Bank A'],
      conditionColumn: 'description',
      condition: 'CONTAINS',
      conditionValue: 'uber',
      action: 'SET',
      actionTarget: 'category',
      actionValue: 'Transport',
      stopProcessing: true,
      rulePhase: 'POST_TRANSFORM',
    })
  })

  it('should handle "All" banks and multiple banks correctly', () => {
    const rows = [
      ['Rule 1', 'All', 'col', 'NOT_EMPTY', '', 'EXCLUDE', '', '', 'false', 'PRE_TRANSFORM'],
      ['Rule 2', 'BankA, BankB', 'col', 'NOT_EMPTY', '', 'EXCLUDE', '', '', 'false', 'PRE_TRANSFORM'],
      ['Rule 3', '', 'col', 'NOT_EMPTY', '', 'EXCLUDE', '', '', 'false', 'PRE_TRANSFORM'],
    ]

    const result = parseRules(rows)

    expect(result.rules[0].banks).toEqual(['All'])
    expect(result.rules[1].banks).toEqual(['BankA', 'BankB'])
    expect(result.rules[2].banks).toEqual(['All']) // Empty defaults to All
  })

  it('should generate warnings for missing required fields', () => {
    const rows = [
      ['No Col', 'All', '', 'CONTAINS', 'val', 'SET', 'cat', 'val', 'false', 'POST_TRANSFORM'],
      ['No Cond Val', 'All', 'col', 'CONTAINS', '', 'SET', 'cat', 'val', 'false', 'POST_TRANSFORM'],
      ['No Action Target SET', 'All', 'col', 'CONTAINS', 'val', 'SET', '', 'val', 'false', 'POST_TRANSFORM'],
      ['No Action Value SET', 'All', 'col', 'CONTAINS', 'val', 'SET', 'cat', '', 'false', 'POST_TRANSFORM'],
      ['Bad Cond', 'All', 'col', 'BAD_COND', 'val', 'SET', 'cat', 'val', 'false', 'POST_TRANSFORM'],
      ['Bad Act', 'All', 'col', 'CONTAINS', 'val', 'BAD_ACT', 'cat', 'val', 'false', 'POST_TRANSFORM'],
      ['Bad Phase', 'All', 'col', 'CONTAINS', 'val', 'SET', 'cat', 'val', 'false', 'BAD_PHASE'],
    ]

    const result = parseRules(rows)

    expect(result.rules).toHaveLength(0)
    expect(result.warnings).toHaveLength(7)
    expect(result.warnings[0].message).toContain('Condition Column is required')
    expect(result.warnings[1].message).toContain('Condition value is required')
    expect(result.warnings[2].message).toContain('Action Target and Action Value are required')
    expect(result.warnings[3].message).toContain('Action Target and Action Value are required')
    expect(result.warnings[4].message).toContain('Invalid condition')
    expect(result.warnings[5].message).toContain('Invalid action')
    expect(result.warnings[6].message).toContain('Invalid rule phase')
  })

  it('should ignore completely empty rows', () => {
    const rows = [
      ['', '', '', '', '', '', '', '', '', ''],
      ['   ', ' ', '', '', '', '', '', '', '', ''],
    ]
    const result = parseRules(rows)
    expect(result.rules).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('should default ruleName if missing', () => {
    const rows = [
      ['', 'All', 'col', 'NOT_EMPTY', '', 'EXCLUDE', '', '', 'false', 'PRE_TRANSFORM'],
    ]
    const result = parseRules(rows)
    expect(result.rules[0].ruleName).toBe('Rule at row 2')
  })
})
