import { getRowHash } from '@/common/helpers'
import type { Table } from '../table/Table'
import type { ImportPipelineContext } from '../import-pipeline/pipeline'
import { FireTable } from '../table/FireTable'
import { applyPreTransformRules, applyPostTransformRules } from './rule-processor'
import type { ImportRule } from './types'

export function applyPreTransformRulesStage(input: Table, context: ImportPipelineContext, rules: ImportRule[]): Table {
  if (!context.ruleEngine) {
    context.ruleEngine = {
      warnings: [], appliedRules: [], rowExcludedRule: {},
    }
  }

  const bankAccount = context.config.getAccountId()

  const result = applyPreTransformRules(input, rules, bankAccount)

  context.ruleEngine.appliedRules.push(...result.appliedRules)
  context.ruleEngine.warnings.push(...result.warnings)

  for (const index of result.excludedIndices) {
    const hash = getRowHash(input.data[index])
    context.ruleEngine.rowExcludedRule[hash] = result.excludedByRule.get(index)!
  }

  return input
}

export function postTransformRulesStage(
  fireTable: FireTable,
  context: ImportPipelineContext,
  rules: ImportRule[],
  dryRun: boolean = false,
): FireTable {
  if (!context.ruleEngine) {
    context.ruleEngine = {
      warnings: [], appliedRules: [], rowExcludedRule: {},
    }
  }

  const bankAccount = context.config.getAccountId()
  const result = applyPostTransformRules(fireTable, rules, bankAccount)

  context.ruleEngine.appliedRules.push(...result.appliedRules)
  context.ruleEngine.warnings.push(...result.warnings)

  // Map excluded indices to hashes before sorting alters row order
  const excludedHashes = new Set<string>()
  const data = fireTable.data

  for (const index of result.excludedIndices) {
    const hash = getRowHash(data[index])
    excludedHashes.add(hash)
    context.ruleEngine.rowExcludedRule[hash] = result.excludedByRule.get(index)!
  }

  // Remove rows permanently if this is an actual import (not preview)
  if (!dryRun && excludedHashes.size > 0) {
    const filteredData = data.filter(row => !excludedHashes.has(getRowHash(row)))
    fireTable = new FireTable(filteredData)
  }

  return fireTable
}
