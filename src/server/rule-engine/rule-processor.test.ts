import { describe, it, expect } from 'vitest'
import { applyPreTransformRules, applyPostTransformRules } from './rule-processor'
import { Table } from '../table/Table'
import { FireTable } from '../table/FireTable'
import type { ImportRule } from './types'

describe('rule-processor', () => {
  describe('applyPreTransformRules', () => {
    const headers = ['description', 'amount', 'date']

    it('should correctly evaluate EQUALS and apply EXCLUDE', () => {
      const data = [
        ['Uber', '10.00', '2023-01-01'],
        ['Salary', '1000.00', '2023-01-01'],
      ]
      const table = new Table(data)
      const rules: ImportRule[] = [{
        ruleName: 'Exclude Uber',
        banks: ['All'],
        conditionColumn: 'description',
        condition: 'EQUALS',
        conditionValue: 'uber',
        action: 'EXCLUDE',
        actionTarget: '',
        stopProcessing: false,
        rulePhase: 'PRE_TRANSFORM',
      }]

      const result = applyPreTransformRules(table, headers, rules, 'TestBank')
      expect(result.excludedIndices.has(0)).toBe(true)
      expect(result.excludedIndices.has(1)).toBe(false)
      expect(result.excludedByRule.get(0)).toBe('Exclude Uber')
    })

    it('should correctly evaluate CONTAINS and apply SET', () => {
      const data = [
        ['Transfer to Savings', '10.00', '2023-01-01'],
      ]
      const table = new Table(data)
      const rules: ImportRule[] = [{
        ruleName: 'Set Category',
        banks: ['All'],
        conditionColumn: 'description',
        condition: 'CONTAINS',
        conditionValue: 'savings',
        action: 'SET',
        actionTarget: 'description',
        actionValue: 'Internal Transfer',
        stopProcessing: false,
        rulePhase: 'PRE_TRANSFORM',
      }]

      const result = applyPreTransformRules(table, headers, rules, 'TestBank')
      expect(result.excludedIndices.size).toBe(0)
      expect(table.getData()[0][0]).toBe('Internal Transfer')
      expect(result.rowsAffectedCount).toBe(1)
    })
  })

  describe('applyPostTransformRules', () => {
    it('should correctly apply a SET action to a FIRE category column based on amount GREATER_THAN', () => {
      const data = [
        ['ref1', 'iban', 'date', 1000, 1000, 'contra', 'salary desc', '', '', 'Unknown', '', new Date(), '', '', '', ''],
      ]
      const fireTable = new FireTable(data as import('../table/types').CellValue[][])
      const rules: ImportRule[] = [{
        ruleName: 'Large Salary',
        banks: ['All'],
        conditionColumn: 'amount',
        condition: 'GREATER_THAN',
        conditionValue: '500',
        action: 'SET',
        actionTarget: 'category',
        actionValue: 'Salary',
        stopProcessing: false,
        rulePhase: 'POST_TRANSFORM',
      }]

      const result = applyPostTransformRules(fireTable, rules, 'TestBank')
      expect(result.excludedIndices.size).toBe(0)

      const categoryIndex = FireTable.getFireColumnIndex('category')
      expect(fireTable.getData()[0][categoryIndex]).toBe('Salary')
      expect(result.rowsAffectedCount).toBe(1)
    })
  })
})
