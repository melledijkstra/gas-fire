import { SheetMock, SpreadsheetMock } from '../../../test-setup'
import {
  loadImportRules,
  getRulesForBank,
  getRulesForPhase,
  clearRulesCache,
} from './rule-loader'
import type { ImportRule } from './types'

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
}))

const getSheetByNameMock = vi.mocked(SpreadsheetMock.getSheetByName)
const getLastRowMock = vi.mocked(SheetMock.getLastRow)

function mockSheetData(rows: unknown[][]) {
  getSheetByNameMock.mockReturnValue(SheetMock)
  getLastRowMock.mockReturnValue(rows.length)
  SheetMock.getSheetValues.mockReturnValue(rows as never)
}

const HEADER_ROW = [
  'Rule Name', 'Bank(s)', 'Condition Column', 'Condition',
  'Condition Value', 'Action', 'Action Column', 'Action Value',
  'Stop Processing?', 'Rule Phase',
]

function makeRuleRow(overrides: Partial<Record<string, string | boolean>> = {}) {
  return [
    overrides['ruleName'] ?? 'Test Rule',
    overrides['banks'] ?? 'All',
    overrides['conditionColumn'] ?? 'description',
    overrides['condition'] ?? 'CONTAINS',
    overrides['conditionValue'] ?? 'internal',
    overrides['action'] ?? 'EXCLUDE',
    overrides['actionColumn'] ?? '',
    overrides['actionValue'] ?? '',
    overrides['stopProcessing'] ?? 'FALSE',
    overrides['rulePhase'] ?? 'POST_TRANSFORM',
  ]
}

describe('loadImportRules', () => {
  beforeEach(() => {
    clearRulesCache()
    vi.clearAllMocks()
  })

  test('parses valid rules from sheet data', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow(),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(1)
    expect(warnings).toHaveLength(0)
    expect(rules[0]).toEqual({
      ruleName: 'Test Rule',
      banks: ['all'],
      conditionColumn: 'description',
      condition: 'CONTAINS',
      conditionValue: 'internal',
      action: 'EXCLUDE',
      actionColumn: 'description',
      actionValue: undefined,
      stopProcessing: false,
      rulePhase: 'POST_TRANSFORM',
      rowIndex: 2,
    })
  })

  test('returns empty array when import-rules sheet does not exist', () => {
    getSheetByNameMock.mockReturnValue(null as never)

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(0)
  })

  test('produces warning for rule with invalid condition', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ condition: 'INVALID' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('Invalid condition')
  })

  test('produces warning for rule with missing condition column', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ conditionColumn: '' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('Missing condition column')
  })

  test('produces warning for CONTAINS rule with no condition value', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ condition: 'CONTAINS', conditionValue: '' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('requires a condition value')
  })

  test('allows NOT_EMPTY rule without condition value', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ condition: 'NOT_EMPTY', conditionValue: '' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(1)
    expect(warnings).toHaveLength(0)
  })

  test('produces warning for SET rule with no action value', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ action: 'SET', actionValue: '' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('requires an action value')
  })

  test('produces warning for ADD rule with non-numeric action value', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ action: 'ADD', actionValue: 'abc' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('requires a numeric action value')
  })

  test('produces warning for invalid rule phase', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ rulePhase: 'INVALID' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('Invalid rule phase')
  })

  test('produces warning for missing banks', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ banks: '' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(0)
    expect(warnings).toHaveLength(1)
    expect(warnings[0].message).toContain('Missing bank(s)')
  })

  test('skips blank rows (empty rule name)', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ ruleName: '' }),
      makeRuleRow({ ruleName: 'Valid Rule' }),
    ])

    const { rules, warnings } = loadImportRules()

    expect(rules).toHaveLength(1)
    expect(rules[0].ruleName).toBe('Valid Rule')
    expect(warnings).toHaveLength(0)
  })

  test('parses comma-separated banks correctly', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ banks: 'Bank A, Bank B, ING' }),
    ])

    const { rules } = loadImportRules()

    expect(rules[0].banks).toEqual(['bank-a', 'bank-b', 'ing'])
  })

  test('defaults actionColumn to conditionColumn when empty', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ conditionColumn: 'description', actionColumn: '', action: 'SET', actionValue: 'test' }),
    ])

    const { rules } = loadImportRules()

    expect(rules[0].actionColumn).toBe('description')
  })

  test('uses explicit actionColumn when provided', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ conditionColumn: 'description', actionColumn: 'category', action: 'SET', actionValue: 'Groceries' }),
    ])

    const { rules } = loadImportRules()

    expect(rules[0].actionColumn).toBe('category')
    expect(rules[0].conditionColumn).toBe('description')
  })

  test('parses stopProcessing as true', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ stopProcessing: 'TRUE' }),
    ])

    const { rules } = loadImportRules()

    expect(rules[0].stopProcessing).toBe(true)
  })

  test('parses multiple rules in order', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ ruleName: 'Rule 1' }),
      makeRuleRow({ ruleName: 'Rule 2' }),
      makeRuleRow({ ruleName: 'Rule 3' }),
    ])

    const { rules } = loadImportRules()

    expect(rules).toHaveLength(3)
    expect(rules[0].rowIndex).toBe(2)
    expect(rules[1].rowIndex).toBe(3)
    expect(rules[2].rowIndex).toBe(4)
  })

  test('handles case-insensitive condition and action', () => {
    mockSheetData([
      HEADER_ROW,
      makeRuleRow({ condition: 'contains', action: 'exclude', rulePhase: 'post_transform' }),
    ])

    const { rules } = loadImportRules()

    expect(rules[0].condition).toBe('CONTAINS')
    expect(rules[0].action).toBe('EXCLUDE')
    expect(rules[0].rulePhase).toBe('POST_TRANSFORM')
  })
})

describe('getRulesForBank', () => {
  const rules: ImportRule[] = [
    {
      ruleName: 'All Banks', banks: ['all'], conditionColumn: 'description',
      condition: 'CONTAINS', conditionValue: 'test', action: 'EXCLUDE',
      stopProcessing: false, rulePhase: 'POST_TRANSFORM', rowIndex: 2,
    },
    {
      ruleName: 'ING Only', banks: ['ing'], conditionColumn: 'description',
      condition: 'CONTAINS', conditionValue: 'test', action: 'EXCLUDE',
      stopProcessing: false, rulePhase: 'POST_TRANSFORM', rowIndex: 3,
    },
    {
      ruleName: 'Multi Bank', banks: ['ing', 'revolut'], conditionColumn: 'description',
      condition: 'CONTAINS', conditionValue: 'test', action: 'EXCLUDE',
      stopProcessing: false, rulePhase: 'POST_TRANSFORM', rowIndex: 4,
    },
  ]

  test('includes rules with "all" bank', () => {
    const result = getRulesForBank(rules, 'ing')
    expect(result).toContainEqual(expect.objectContaining({ ruleName: 'All Banks' }))
  })

  test('includes rules matching specific bank ID', () => {
    const result = getRulesForBank(rules, 'ing')
    expect(result).toContainEqual(expect.objectContaining({ ruleName: 'ING Only' }))
  })

  test('excludes rules for other banks', () => {
    const result = getRulesForBank(rules, 'n26')
    expect(result).toHaveLength(1)
    expect(result[0].ruleName).toBe('All Banks')
  })

  test('handles case-insensitive bank matching via slugify', () => {
    const result = getRulesForBank(rules, 'ING')
    expect(result).toHaveLength(3)
  })

  test('matches multi-bank rules', () => {
    const result = getRulesForBank(rules, 'revolut')
    expect(result).toHaveLength(2)
    expect(result).toContainEqual(expect.objectContaining({ ruleName: 'Multi Bank' }))
  })
})

describe('getRulesForPhase', () => {
  const rules: ImportRule[] = [
    {
      ruleName: 'Pre Rule', banks: ['all'], conditionColumn: 'Amount',
      condition: 'GREATER_THAN', conditionValue: '100', action: 'EXCLUDE',
      stopProcessing: false, rulePhase: 'PRE_TRANSFORM', rowIndex: 2,
    },
    {
      ruleName: 'Post Rule', banks: ['all'], conditionColumn: 'description',
      condition: 'CONTAINS', conditionValue: 'test', action: 'EXCLUDE',
      stopProcessing: false, rulePhase: 'POST_TRANSFORM', rowIndex: 3,
    },
  ]

  test('filters by PRE_TRANSFORM', () => {
    const result = getRulesForPhase(rules, 'PRE_TRANSFORM')
    expect(result).toHaveLength(1)
    expect(result[0].ruleName).toBe('Pre Rule')
  })

  test('filters by POST_TRANSFORM', () => {
    const result = getRulesForPhase(rules, 'POST_TRANSFORM')
    expect(result).toHaveLength(1)
    expect(result[0].ruleName).toBe('Post Rule')
  })
})
