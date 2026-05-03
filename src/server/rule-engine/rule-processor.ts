import { Logger } from '@/common/logger'
import { FireTable } from '@/common/table/FireTable'
import { Table } from '@/common/table/Table'
import type { CellValue } from '@/common/types'
import type { ImportRule, RuleCondition, RulePhase, RuleWarning } from './types'

export interface RuleExecutionContext {
  excludedIndices: Set<number>
  appliedRules: ImportRule[]
  rowsAffectedCount: number
  warnings: RuleWarning[]
  excludedByRule: Map<number, string> // Maps row index to ruleName
}

function addRuleWarning(context: RuleExecutionContext, ruleName: string, message: string): void {
  if (!context.warnings.some(w => w.ruleName === ruleName)) {
    context.warnings.push({ ruleName, message })
  }
}

export class RuleProcessor {
  regexCache = new Map<string, RegExp>()
  importRules: ImportRule[] = []

  constructor(importRules: ImportRule[]) {
    this.importRules = importRules
  }

  /**
   * Parses a string into a RegExp object.
   * Supports /pattern/flags format. If flags are omitted or it's not in /pattern/flags format,
   * it defaults to case-insensitive ('i') for backward compatibility.
   */
  private parseRegexString(pattern: string): RegExp {
    // Regex to match /pattern/flags format
    // The pattern part (.*) is greedy to handle slashes within the regex itself
    const match = pattern.match(/^\/(.*)\/([gimsuyv]*)$/)

    if (match) {
      const [, regexPattern, flags] = match
      return new RegExp(regexPattern, flags)
    }

    // No flags if not in /pattern/flags format
    return new RegExp(pattern)
  }

  getCachedRegex(pattern: string): RegExp {
    const cachedRegex = this.regexCache.get(pattern)

    if (cachedRegex) {
      return cachedRegex
    }

    const regex = this.parseRegexString(pattern)
    this.regexCache.set(pattern, regex)
    return regex
  }

  /**
   * Handles the specific action logic for a rule that has met its condition.
   */
  private handleRuleAction(
    row: CellValue[],
    rowIndex: number,
    rule: ImportRule,
    getColumnIndex: (colName: string) => number,
    context: RuleExecutionContext,
  ): void {
    if (rule.action === 'EXCLUDE') {
      context.excludedIndices.add(rowIndex)
      context.excludedByRule.set(rowIndex, rule.ruleName)
      return
    }

    const actionTargetIndex = getColumnIndex(rule?.actionColumn ?? '')
    if (actionTargetIndex === -1) {
      addRuleWarning(context, rule.ruleName, `Target column '${rule?.actionColumn ?? ''}' not found.`)
    }
    else {
      this.applyAction(row, rule, getColumnIndex)
    }
  }

  /**
   * Evaluates a single condition.
   */
  // eslint-disable-next-line complexity
  private evaluateCondition(cellValue: string, condition: RuleCondition, conditionValue?: string): boolean {
    const value = cellValue?.toString() ?? ''

    switch (condition) {
      case 'NOT_EMPTY':
        return value.trim() !== ''
      case 'EQUALS':
        return value.toLowerCase() === (conditionValue?.toLowerCase() ?? '')
      case 'CONTAINS':
        return value.toLowerCase().includes((conditionValue?.toLowerCase() ?? ''))
      case 'NOT_CONTAINS':
        return !value.toLowerCase().includes((conditionValue?.toLowerCase() ?? ''))
      case 'REGEX':
        try {
          const regex = this.getCachedRegex(conditionValue ?? '')
          return regex.test(value)
        }
        catch {
          Logger.warn(`Invalid regex in rule: ${conditionValue}`)
          return false
        }
      case 'GREATER_THAN': {
        const numVal = Number.parseFloat(value)
        const target = Number.parseFloat(conditionValue ?? '0')
        return !Number.isNaN(numVal) && !Number.isNaN(target) && numVal > target
      }
      case 'LESS_THAN': {
        const numVal = Number.parseFloat(value)
        const target = Number.parseFloat(conditionValue ?? '0')
        return !Number.isNaN(numVal) && !Number.isNaN(target) && numVal < target
      }
      default:
        return false
    }
  }

  /**
   * Applies rules to a single row.
   * Returns true if the row was affected by any rule.
   */
  private applyRulesToRow(
    row: CellValue[],
    rowIndex: number,
    rules: ImportRule[],
    getColumnIndex: (colName: string) => number,
    context: RuleExecutionContext,
  ): boolean {
    let rowAffected = false

    for (const rule of rules) {
      const conditionColIndex = getColumnIndex(rule.conditionColumn)

      if (conditionColIndex === -1) {
        addRuleWarning(context, rule.ruleName, `Column '${rule.conditionColumn}' not found.`)
        continue
      }

      const cellValue = row[conditionColIndex]?.toString() ?? ''
      const conditionMet = this.evaluateCondition(cellValue, rule.condition, rule.conditionValue)

      if (conditionMet) {
        rowAffected = true

        if (!context.appliedRules.includes(rule)) {
          context.appliedRules.push(rule)
        }

        this.handleRuleAction(row, rowIndex, rule, getColumnIndex, context)

        if (rule.action === 'EXCLUDE') {
          return true // Row is excluded, stop processing further rules for this row
        }

        if (rule.stopProcessing) {
          break
        }
      }
    }

    return rowAffected
  }

  /**
   * Applies actions to a specific row array.
   * Mutates the row array if it's a SET/ADD/SUBTRACT action.
   */
  // eslint-disable-next-line complexity
  private applyAction(
    row: CellValue[],
    rule: ImportRule,
    getColumnIndex: (colName: string) => number,
  ): void {
    const targetColumnIndex = getColumnIndex(rule?.actionColumn ?? '')
    if (targetColumnIndex === -1) return

    const currentValue = row[targetColumnIndex]?.toString() ?? ''

    switch (rule.action) {
      case 'SET':
        row[targetColumnIndex] = rule.actionValue ?? ''
        break
      case 'ADD': {
        const numVal = Number.parseFloat(currentValue) || 0
        const addVal = Number.parseFloat(rule.actionValue ?? '0')
        if (!Number.isNaN(numVal) && !Number.isNaN(addVal)) {
          row[targetColumnIndex] = (numVal + addVal).toString()
        }
        break
      }
      case 'ADD_COLUMN': {
        const addColIndex = getColumnIndex(rule.actionValue ?? '')
        if (addColIndex === -1) {
          // We don't want to log for every row, but maybe we should have warned at the beginning of applyRulesToRow
          break
        }
        const numVal = Number.parseFloat(currentValue) || 0
        const addVal = Number.parseFloat(row[addColIndex]?.toString() ?? '0')
        row[targetColumnIndex] = (numVal + addVal).toString()
        break
      }
      case 'SUBTRACT': {
        const numVal = Number.parseFloat(currentValue) || 0
        const subVal = Number.parseFloat(rule.actionValue ?? '0')
        if (!Number.isNaN(numVal) && !Number.isNaN(subVal)) {
          row[targetColumnIndex] = (numVal - subVal).toString()
        }
        break
      }
      case 'SUBTRACT_COLUMN': {
        const subColIndex = getColumnIndex(rule.actionValue ?? '')
        if (subColIndex === -1) {
          Logger.warn(`Action value column '${rule.actionValue}' not found for rule '${rule.ruleName}'.`)
          break
        }
        const numVal = Number.parseFloat(currentValue) || 0
        const subVal = Number.parseFloat(row[subColIndex]?.toString() ?? '0')
        if (!Number.isNaN(numVal) && !Number.isNaN(subVal)) {
          row[targetColumnIndex] = (numVal - subVal).toString()
        }
        break
      }
      case 'EXCLUDE':
        // Handled outside
        break
    }
  }

  /**
   * Filters rules by bank applicability and phase.
   */
  private getApplicableRules(accountId: string, phase: RulePhase): ImportRule[] {
    return this.importRules.filter((rule) => {
      if (rule.rulePhase !== phase) return false
      if (rule.banks.some(b => b.toLowerCase() === 'all')) return true
      return rule.banks.some(b => b.toLowerCase() === accountId.toLowerCase())
    })
  }

  /**
   * Applies PRE_TRANSFORM rules to a raw Table.
   * Note: EXCLUDE rules don't remove the row from the Table directly in this function,
   * they just return the indices to be removed so the caller can handle it safely.
   */
  applyPreTransformRules(
    table: Table,
    accountId: string,
  ): RuleExecutionContext {
    Logger.time('applyPreTransformRules')
    const applicableRules = this.getApplicableRules(accountId, 'PRE_TRANSFORM')
    const context: RuleExecutionContext = {
      excludedIndices: new Set(),
      appliedRules: [],
      rowsAffectedCount: 0,
      warnings: [],
      excludedByRule: new Map(),
    }

    if (applicableRules.length === 0) return context

    const data = table.data
    const affectedRows = new Set<number>()
    const getColumnIndex = (name: string) => table.headers.indexOf(name)

    for (let i = 0; i < data.length; i++) {
      if (this.applyRulesToRow(data[i], i, applicableRules, getColumnIndex, context)) {
        affectedRows.add(i)
      }
    }

    context.rowsAffectedCount = affectedRows.size

    Logger.timeEnd('applyPreTransformRules')

    return context
  }

  /**
   * Applies POST_TRANSFORM rules to a FireTable.
   * Note: EXCLUDE rules don't remove the row from the FireTable directly in this function.
   */
  applyPostTransformRules(
    fireTable: FireTable,
    accountId: string,
  ): RuleExecutionContext {
    Logger.time('applyPostTransformRules')
    const applicableRules = this.getApplicableRules(accountId, 'POST_TRANSFORM')
    const context: RuleExecutionContext = {
      appliedRules: [],
      rowsAffectedCount: 0,
      warnings: [],
      excludedIndices: new Set(),
      excludedByRule: new Map(),
    }

    if (applicableRules.length === 0) return context

    const data = fireTable.data
    const affectedRows = new Set<number>()
    const getColumnIndex = (name: string) => fireTable.headers.indexOf(name)

    for (let i = 0; i < data.length; i++) {
      if (this.applyRulesToRow(data[i], i, applicableRules, getColumnIndex, context)) {
        affectedRows.add(i)
      }
    }

    context.rowsAffectedCount = affectedRows.size

    Logger.timeEnd('applyPostTransformRules')

    return context
  }
}
