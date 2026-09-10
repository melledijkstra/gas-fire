import { getRowHash } from '@/common/helpers'
import { YMYLTable } from '@/common/table/YMYLTable'
import type { Table } from '@/common/table/Table'
import type { RuleEngineResult } from './types'
import type { RuleProcessor } from './rule-processor'

/**
 * creates an initial empty RuleEngineResult.
 */
export function createRuleEngineResult(rulesCount = 0): RuleEngineResult {
  return {
    warnings: [],
    appliedRules: [],
    removedHashes: new Set<string>(),
    rowExcludedRule: {},
    rulesCount,
  }
}

/**
 * applies PRE_TRANSFORM rules to raw Table data before conversion to YMYL schema.
 */
export function applyPreTransformRules(
  input: Table,
  ruleProcessor: RuleProcessor,
  bankAccount: string,
  result: RuleEngineResult,
): Table {
  const execResult = ruleProcessor.applyPreTransformRules(input, bankAccount)

  result.appliedRules.push(...execResult.appliedRules)
  result.warnings.push(...execResult.warnings)

  for (const index of execResult.excludedIndices) {
    const hash = getRowHash(input.data[index])
    result.rowExcludedRule[hash] = execResult.excludedByRule.get(index)!
    result.removedHashes.add(hash)
  }

  return input
}

/**
 * applies POST_TRANSFORM rules to a YMYLTable.
 * if dryRun is false, permanently removes excluded rows from the returned table.
 */
export function applyPostTransformRules(
  ymylTable: YMYLTable,
  ruleProcessor: RuleProcessor,
  bankAccount: string,
  result: RuleEngineResult,
  dryRun = false,
): YMYLTable {
  const execResult = ruleProcessor.applyPostTransformRules(ymylTable, bankAccount)

  result.appliedRules.push(...execResult.appliedRules)
  result.warnings.push(...execResult.warnings)

  // map excluded indices to hashes before sorting alters row order
  const excludedHashes = new Set<string>()
  const data = ymylTable.data

  for (const index of execResult.excludedIndices) {
    const hash = getRowHash(data[index])
    excludedHashes.add(hash)
    result.rowExcludedRule[hash] = execResult.excludedByRule.get(index)!
    result.removedHashes.add(hash)
  }

  // remove rows permanently if this is an actual import (not preview)
  if (!dryRun && excludedHashes.size > 0) {
    const filteredData = data.filter((_row, index) => !execResult.excludedIndices.has(index))
    ymylTable = new YMYLTable(filteredData)
  }

  return ymylTable
}
