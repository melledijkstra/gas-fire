import { describe, it, expect } from 'vitest'
import { applyPreTransformRules, applyPostTransformRules } from './rule-processor'
import { Table } from '@/common/table/Table'
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
      const table = new Table(headers, data)
      const rules: ImportRule[] = [{
        ruleName: 'Exclude Uber',
        banks: ['All'],
        conditionColumn: 'description',
        condition: 'EQUALS',
        conditionValue: 'uber',
        action: 'EXCLUDE',
        actionColumn: '',
        stopProcessing: false,
        rulePhase: 'PRE_TRANSFORM',
      }]

      const result = applyPreTransformRules(table, rules, 'TestBank')
      expect(result.excludedIndices.has(0)).toBe(true)
      expect(result.excludedIndices.has(1)).toBe(false)
      expect(result.excludedByRule.get(0)).toBe('Exclude Uber')
    })

    it('should correctly evaluate CONTAINS and apply SET', () => {
      const data = [
        ['Transfer to Savings', '10.00', '2023-01-01'],
      ]
      const table = new Table(headers, data)
      const rules: ImportRule[] = [{
        ruleName: 'Set Category',
        banks: ['All'],
        conditionColumn: 'description',
        condition: 'CONTAINS',
        conditionValue: 'savings',
        action: 'SET',
        actionColumn: 'description',
        actionValue: 'Internal Transfer',
        stopProcessing: false,
        rulePhase: 'PRE_TRANSFORM',
      }]

      const result = applyPreTransformRules(table, rules, 'TestBank')
      expect(result.excludedIndices.size).toBe(0)
      expect(table.data[0][0]).toBe('Internal Transfer')
      expect(result.rowsAffectedCount).toBe(1)
    })

    it('should count unique rules triggered, not every row match', () => {
      const data = [
        ['Transfer to Savings', '10.00', '2023-01-01'],
        ['Transfer to Savings 2', '20.00', '2023-01-02'],
      ]
      const table = new Table(headers, data)
      const rules: ImportRule[] = [{
        ruleName: 'Set Category',
        banks: ['All'],
        conditionColumn: 'description',
        condition: 'CONTAINS',
        conditionValue: 'savings',
        action: 'SET',
        actionColumn: 'description',
        actionValue: 'Internal Transfer',
        stopProcessing: false,
        rulePhase: 'PRE_TRANSFORM',
      }]

      const result = applyPreTransformRules(table, rules, 'TestBank')
      expect(result.appliedRules.length).toBe(1) // Should be 1 unique rule, currently it will be 2
    })

    it('should include EXCLUDE rules in appliedRules', () => {
      const data = [
        ['Uber', '10.00', '2023-01-01'],
      ]
      const table = new Table(headers, data)
      const rules: ImportRule[] = [{
        ruleName: 'Exclude Uber',
        banks: ['All'],
        conditionColumn: 'description',
        condition: 'EQUALS',
        conditionValue: 'uber',
        action: 'EXCLUDE',
        actionColumn: '',
        stopProcessing: false,
        rulePhase: 'PRE_TRANSFORM',
      }]

      const result = applyPreTransformRules(table, rules, 'TestBank')
      expect(result.appliedRules.length).toBe(1)
      expect(result.appliedRules[0].ruleName).toBe('Exclude Uber')
    })

    it('should correctly apply SUBTRACT_COLUMN and ADD_COLUMN', () => {
      const headers = ['amount', 'fee', 'bonus']
      const data = [
        ['100.00', '10.00', '5.00'],
      ]
      const table = new Table(headers, data)
      const rules: ImportRule[] = [
        {
          ruleName: 'Subtract Fee',
          banks: ['All'],
          conditionColumn: 'amount',
          condition: 'EQUALS',
          conditionValue: '100.00',
          action: 'SUBTRACT_COLUMN',
          actionColumn: 'amount',
          actionValue: 'fee',
          stopProcessing: false,
          rulePhase: 'PRE_TRANSFORM',
        },
        {
          ruleName: 'Add Bonus',
          banks: ['All'],
          conditionColumn: 'amount',
          condition: 'NOT_EMPTY',
          conditionValue: '',
          action: 'ADD_COLUMN',
          actionColumn: 'amount',
          actionValue: 'bonus',
          stopProcessing: false,
          rulePhase: 'PRE_TRANSFORM',
        },
      ]

      applyPreTransformRules(table, rules, 'TestBank')
      // 100 - 10 = 90
      // 90 + 5 = 95
      expect(table.data[0][0]).toBe('95')
    })
  })

  describe('applyPostTransformRules', () => {
    it('should correctly apply a SET action to a FIRE category column based on amount GREATER_THAN', () => {
      const data = [
        ['ref1', 'iban', 'date', 1000, 1000, 'contra', 'salary desc', '', '', 'Unknown', '', new Date(), '', '', '', ''],
      ]
      const fireTable = new FireTable(data as import('@/common/types').CellValue[][])
      const rules: ImportRule[] = [{
        ruleName: 'Large Salary',
        banks: ['All'],
        conditionColumn: 'amount',
        condition: 'GREATER_THAN',
        conditionValue: '500',
        action: 'SET',
        actionColumn: 'category',
        actionValue: 'Salary',
        stopProcessing: false,
        rulePhase: 'POST_TRANSFORM',
      }]

      const result = applyPostTransformRules(fireTable, rules, 'TestBank')
      expect(result.excludedIndices.size).toBe(0)

      const categoryIndex = FireTable.getFireColumnIndex('category')
      expect(fireTable.data[0][categoryIndex]).toBe('Salary')
      expect(result.rowsAffectedCount).toBe(1)
    })
  })
})
