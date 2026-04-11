import { Table } from '../table/Table'
import type { ImportRule } from './types'
import {
  processRules,
  createRawColumnResolver,
  createFireColumnResolver,
} from './rule-processor'

function makeRule(overrides: Partial<ImportRule> = {}): ImportRule {
  return {
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
    ...overrides,
  }
}

describe('createRawColumnResolver', () => {
  test('resolves CSV header names to indices', () => {
    const resolver = createRawColumnResolver(['Date', 'Amount', 'Description'])
    expect(resolver('Amount')).toBe(1)
    expect(resolver('Description')).toBe(2)
  })

  test('returns -1 for unknown column names', () => {
    const resolver = createRawColumnResolver(['Date', 'Amount'])
    expect(resolver('Missing')).toBe(-1)
  })
})

describe('createFireColumnResolver', () => {
  test('resolves FIRE column names to indices', () => {
    const resolver = createFireColumnResolver()
    expect(resolver('ref')).toBe(0)
    expect(resolver('iban')).toBe(1)
    expect(resolver('date')).toBe(2)
    expect(resolver('amount')).toBe(3)
    expect(resolver('description')).toBe(6)
    expect(resolver('category')).toBe(9)
  })

  test('returns -1 for unknown column names', () => {
    const resolver = createFireColumnResolver()
    expect(resolver('nonexistent')).toBe(-1)
  })
})

describe('processRules', () => {
  describe('EXCLUDE action', () => {
    test('marks matching row as excluded', () => {
      const table = Table.from([
        ['2024-01-01', 100, 'internal transfer'],
        ['2024-01-02', 50, 'grocery store'],
      ])
      const resolver = createRawColumnResolver(['date', 'amount', 'description'])
      const rules = [makeRule({ conditionColumn: 'description', conditionValue: 'internal' })]

      const result = processRules(table, rules, resolver, false)

      expect(result.rowResults[0].excluded).toBe(true)
      expect(result.rowResults[0].excludedByRule).toBe('Test Rule')
      expect(result.rowResults[1].excluded).toBe(false)
      expect(result.rowsExcluded).toBe(1)
    })

    test('does not process further rules after EXCLUDE', () => {
      const table = Table.from([
        ['2024-01-01', 100, 'internal transfer'],
      ])
      const resolver = createRawColumnResolver(['date', 'amount', 'description'])
      const rules = [
        makeRule({ ruleName: 'Exclude Rule', action: 'EXCLUDE' }),
        makeRule({ ruleName: 'Set Rule', action: 'SET', actionColumn: 'amount', actionValue: '999' }),
      ]

      const result = processRules(table, rules, resolver, false)

      expect(result.rowResults[0].matchedRules).toHaveLength(1)
      expect(result.rowResults[0].matchedRules[0].ruleName).toBe('Exclude Rule')
    })
  })

  describe('SET action', () => {
    test('modifies target column value', () => {
      const table = Table.from([
        ['cafe purchase', '', 50],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'amount'])
      const rules = [makeRule({
        conditionColumn: 'description',
        condition: 'CONTAINS',
        conditionValue: 'cafe',
        action: 'SET',
        actionColumn: 'category',
        actionValue: 'Eating Out',
      })]

      const result = processRules(table, rules, resolver, false)

      expect(table.getData()[0][1]).toBe('Eating Out')
      expect(result.rowResults[0].modifications).toEqual({ category: 'Eating Out' })
      expect(result.rowsModified).toBe(1)
    })
  })

  describe('ADD action', () => {
    test('adds to numeric column value', () => {
      const table = Table.from([
        ['purchase', 100],
      ])
      const resolver = createRawColumnResolver(['description', 'amount'])
      const rules = [makeRule({
        conditionColumn: 'description',
        condition: 'NOT_EMPTY',
        action: 'ADD',
        actionColumn: 'amount',
        actionValue: '10',
      })]

      const result = processRules(table, rules, resolver, false)

      expect(table.getData()[0][1]).toBe(110)
      expect(result.rowResults[0].modifications).toEqual({ amount: 110 })
    })
  })

  describe('SUBTRACT action', () => {
    test('subtracts from numeric column value', () => {
      const table = Table.from([
        ['purchase', 100],
      ])
      const resolver = createRawColumnResolver(['description', 'amount'])
      const rules = [makeRule({
        conditionColumn: 'description',
        condition: 'NOT_EMPTY',
        action: 'SUBTRACT',
        actionColumn: 'amount',
        actionValue: '25',
      })]

      const result = processRules(table, rules, resolver, false)

      expect(table.getData()[0][1]).toBe(75)
      expect(result.rowResults[0].modifications).toEqual({ amount: 75 })
    })
  })

  describe('stopProcessing', () => {
    test('prevents further rules for that row', () => {
      const table = Table.from([
        ['cafe', '', 50],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'amount'])
      const rules = [
        makeRule({
          ruleName: 'Rule 1',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Food',
          stopProcessing: true,
        }),
        makeRule({
          ruleName: 'Rule 2',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Overwrite',
        }),
      ]

      processRules(table, rules, resolver, false)

      expect(table.getData()[0][1]).toBe('Food')
    })

    test('only affects the current row', () => {
      const table = Table.from([
        ['cafe', '', 50],
        ['cafe', '', 30],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'amount'])
      const rules = [
        makeRule({
          ruleName: 'Rule 1',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Food',
          stopProcessing: true,
        }),
        makeRule({
          ruleName: 'Rule 2',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Overwrite',
        }),
      ]

      const result = processRules(table, rules, resolver, false)

      // stopProcessing only stops for the row it matches, not subsequent rows
      // BUT: Rule 1 with stopProcessing=true stops Rule 2 for EACH row individually
      // Both rows should be 'Food' because each row processes Rule 1 first and stops
      expect(table.getData()[0][1]).toBe('Food')
      expect(table.getData()[1][1]).toBe('Food')
      expect(result.rowResults[0].matchedRules).toHaveLength(1)
      expect(result.rowResults[1].matchedRules).toHaveLength(1)
    })
  })

  describe('rule ordering', () => {
    test('rules are applied in the order provided', () => {
      const table = Table.from([
        ['cafe', '', 50],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'amount'])
      const rules = [
        makeRule({
          ruleName: 'First',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Food',
        }),
        makeRule({
          ruleName: 'Second',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Overwritten',
        }),
      ]

      processRules(table, rules, resolver, false)

      // Second rule overwrites first
      expect(table.getData()[0][1]).toBe('Overwritten')
    })
  })

  describe('dryRun mode', () => {
    test('does not mutate table data', () => {
      const table = Table.from([
        ['cafe', '', 50],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'amount'])
      const rules = [makeRule({
        action: 'SET',
        actionColumn: 'category',
        actionValue: 'Food',
        conditionColumn: 'description',
        condition: 'CONTAINS',
        conditionValue: 'cafe',
      })]

      processRules(table, rules, resolver, true)

      expect(table.getData()[0][1]).toBe('')
    })

    test('tracks modifications in result', () => {
      const table = Table.from([
        ['cafe', '', 50],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'amount'])
      const rules = [makeRule({
        action: 'SET',
        actionColumn: 'category',
        actionValue: 'Food',
        conditionColumn: 'description',
        condition: 'CONTAINS',
        conditionValue: 'cafe',
      })]

      const result = processRules(table, rules, resolver, true)

      expect(result.rowResults[0].modifications).toEqual({ category: 'Food' })
      expect(result.rowsModified).toBe(1)
    })

    test('tracks exclusions without mutating', () => {
      const table = Table.from([
        ['internal transfer', 100],
      ])
      const resolver = createRawColumnResolver(['description', 'amount'])
      const rules = [makeRule()]

      const result = processRules(table, rules, resolver, true)

      expect(result.rowResults[0].excluded).toBe(true)
      expect(result.rowsExcluded).toBe(1)
      // Data is still in the table
      expect(table.getData()).toHaveLength(1)
    })
  })

  describe('unknown column handling', () => {
    test('produces warning for unknown condition column', () => {
      const table = Table.from([['test', 100]])
      const resolver = createRawColumnResolver(['description', 'amount'])
      const rules = [makeRule({ conditionColumn: 'nonexistent' })]

      const result = processRules(table, rules, resolver, false)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('Column "nonexistent" not found')
    })

    test('produces warning for unknown action column', () => {
      const table = Table.from([['cafe', 100]])
      const resolver = createRawColumnResolver(['description', 'amount'])
      const rules = [makeRule({
        conditionColumn: 'description',
        condition: 'CONTAINS',
        conditionValue: 'cafe',
        action: 'SET',
        actionColumn: 'nonexistent',
        actionValue: 'test',
      })]

      const result = processRules(table, rules, resolver, false)

      expect(result.warnings).toHaveLength(1)
      expect(result.warnings[0].message).toContain('Action column "nonexistent" not found')
    })
  })

  describe('multiple rules modifying different columns', () => {
    test('multiple rules can modify different columns on same row', () => {
      const table = Table.from([
        ['cafe latte', '', '', 50],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'label', 'amount'])
      const rules = [
        makeRule({
          ruleName: 'Categorize',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Food',
        }),
        makeRule({
          ruleName: 'Label',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'label',
          actionValue: 'Coffee',
        }),
      ]

      processRules(table, rules, resolver, false)

      expect(table.getData()[0][1]).toBe('Food')
      expect(table.getData()[0][2]).toBe('Coffee')
    })
  })

  describe('rulesApplied count', () => {
    test('counts unique rules that matched at least one row', () => {
      const table = Table.from([
        ['cafe', '', 50],
        ['grocery', '', 30],
        ['cafe', '', 20],
      ])
      const resolver = createRawColumnResolver(['description', 'category', 'amount'])
      const rules = [
        makeRule({
          ruleName: 'Cafe Rule',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'cafe',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Food',
        }),
        makeRule({
          ruleName: 'Grocery Rule',
          conditionColumn: 'description',
          condition: 'CONTAINS',
          conditionValue: 'grocery',
          action: 'SET',
          actionColumn: 'category',
          actionValue: 'Groceries',
        }),
      ]

      const result = processRules(table, rules, resolver, false)

      // Both rules matched at least one row
      expect(result.rulesApplied).toBe(2)
      expect(result.rulesLoaded).toBe(2)
    })
  })

  describe('with FireTable column resolver', () => {
    test('resolves FIRE column names correctly', () => {
      // Build a minimal FireTable-like data structure (16 columns aligned to FIRE_COLUMNS)
      // [ref, iban, date, amount, balance, contra_account, description, comments, icon, category, label, import_date, hours, disabled, contra_iban, currency]
      const table = Table.from([
        [null, 'NL123', new Date('2024-01-01'), 50, null, 'Coffee Shop', 'latte purchase', null, null, '', null, new Date(), null, null, null, 'EUR'],
      ])
      const resolver = createFireColumnResolver()
      const rules = [makeRule({
        conditionColumn: 'contra_account',
        condition: 'CONTAINS',
        conditionValue: 'Coffee',
        action: 'SET',
        actionColumn: 'category',
        actionValue: 'Eating Out',
      })]

      processRules(table, rules, resolver, false)

      // category is at index 9
      expect(table.getData()[0][9]).toBe('Eating Out')
    })
  })
})
