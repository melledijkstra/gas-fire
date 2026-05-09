import { Logger } from '@/common/logger'
import { FireTable } from '@/common/table/FireTable'
import { Table } from '@/common/table/Table'
import type { CellValue } from '@/common/types'
import type { ImportRule, RuleCondition, RulePhase, RuleWarning } from './types'

interface RuleExecutionContext {
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

  private parseRegexString(pattern: string): RegExp {
    // Regex to match /pattern/flags format
    // The pattern part (.*) is greedy to handle slashes within the regex itself
    const match = /^\/(.*)\/([gimsuyv]*)$/.exec(pattern)

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

  private evaluateNumericCondition(value: string, conditionValue: string | undefined, operator: 'GREATER_THAN' | 'LESS_THAN'): boolean {
    const numVal = Number.parseFloat(value)
    const target = Number.parseFloat(conditionValue ?? '0')
    if (Number.isNaN(numVal) || Number.isNaN(target)) return false

    return operator === 'GREATER_THAN' ? numVal > target : numVal < target
  }

  private evaluateRegexCondition(value: string, conditionValue: string | undefined): boolean {
    try {
      const regex = this.getCachedRegex(conditionValue ?? '')
      return regex.test(value)
    }
    catch {
      Logger.warn(`Invalid regex in rule: ${conditionValue}`)
      return false
    }
  }

  private evaluateStringCondition(value: string, condition: string, conditionValue: string | undefined): boolean {
    const target = conditionValue?.toLowerCase() ?? ''
    const val = value.toLowerCase()

    if (condition === 'EQUALS') return val === target
    if (condition === 'CONTAINS') return val.includes(target)
    if (condition === 'NOT_CONTAINS') return !val.includes(target)

    return false
  }

  /**
   * Evaluates a single condition.
   */
  private evaluateCondition(cellValue: string, condition: RuleCondition, conditionValue?: string): boolean {
    const value = cellValue?.toString() ?? ''

    if (condition === 'NOT_EMPTY') return value.trim() !== ''
    if (condition === 'REGEX') return this.evaluateRegexCondition(value, conditionValue)
    if (condition === 'GREATER_THAN' || condition === 'LESS_THAN') {
      return this.evaluateNumericCondition(value, conditionValue, condition)
    }

    return this.evaluateStringCondition(value, condition, conditionValue)
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

  private applyNumericAction(row: CellValue[], targetColumnIndex: number, actionValueStr: string, operator: 'ADD' | 'SUBTRACT'): void {
    const currentValue = row[targetColumnIndex]?.toString() ?? ''
    const numVal = Number.parseFloat(currentValue) || 0
    const val = Number.parseFloat(actionValueStr)
    if (!Number.isNaN(numVal) && !Number.isNaN(val)) {
      row[targetColumnIndex] = operator === 'ADD' ? (numVal + val).toString() : (numVal - val).toString()
    }
  }

  private applyColumnNumericAction(
    row: CellValue[],
    targetColumnIndex: number,
    actionColumnName: string,
    getColumnIndex: (colName: string) => number,
    operator: 'ADD' | 'SUBTRACT',
    ruleName: string,
  ): void {
    const sourceColIndex = getColumnIndex(actionColumnName)
    if (sourceColIndex === -1) {
      if (operator === 'SUBTRACT') {
        Logger.warn(`Action value column '${actionColumnName}' not found for rule '${ruleName}'.`)
      }
      return
    }

    const actionValueStr = row[sourceColIndex]?.toString() ?? '0'
    this.applyNumericAction(row, targetColumnIndex, actionValueStr, operator)
  }

  /**
   * Applies actions to a specific row array.
   * Mutates the row array if it's a SET/ADD/SUBTRACT action.
   */
  private applyAction(
    row: CellValue[],
    rule: ImportRule,
    getColumnIndex: (colName: string) => number,
  ): void {
    const targetColumnIndex = getColumnIndex(rule?.actionColumn ?? '')
    if (targetColumnIndex === -1) return

    switch (rule.action) {
      case 'SET':
        row[targetColumnIndex] = rule.actionValue ?? ''
        break
      case 'ADD':
      case 'SUBTRACT':
        this.applyNumericAction(row, targetColumnIndex, rule.actionValue ?? '0', rule.action)
        break
      case 'ADD_COLUMN':
      case 'SUBTRACT_COLUMN': {
        const op = rule.action === 'ADD_COLUMN' ? 'ADD' : 'SUBTRACT'
        this.applyColumnNumericAction(row, targetColumnIndex, rule.actionValue ?? '', getColumnIndex, op, rule.ruleName)
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

  private applyRulesToTable(
    table: Table | FireTable,
    accountId: string,
    phase: RulePhase,
  ): RuleExecutionContext {
    const loggerName = phase === 'PRE_TRANSFORM' ? 'applyPreTransformRules' : 'applyPostTransformRules'
    Logger.time(loggerName)

    const applicableRules = this.getApplicableRules(accountId, phase)
    const context: RuleExecutionContext = {
      excludedIndices: new Set(),
      appliedRules: [],
      rowsAffectedCount: 0,
      warnings: [],
      excludedByRule: new Map(),
    }

    if (applicableRules.length === 0) {
      Logger.timeEnd(loggerName)
      return context
    }

    const data = table.data
    const affectedRows = new Set<number>()
    const getColumnIndex = (name: string) => table.headers.indexOf(name)

    for (let i = 0; i < data.length; i++) {
      if (this.applyRulesToRow(data[i], i, applicableRules, getColumnIndex, context)) {
        affectedRows.add(i)
      }
    }

    context.rowsAffectedCount = affectedRows.size

    Logger.timeEnd(loggerName)

    return context
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
    return this.applyRulesToTable(table, accountId, 'PRE_TRANSFORM')
  }

  /**
   * Applies POST_TRANSFORM rules to a FireTable.
   * Note: EXCLUDE rules don't remove the row from the FireTable directly in this function.
   */
  applyPostTransformRules(
    fireTable: FireTable,
    accountId: string,
  ): RuleExecutionContext {
    return this.applyRulesToTable(fireTable, accountId, 'POST_TRANSFORM')
  }
}
