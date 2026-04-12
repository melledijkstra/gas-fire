import { slugify } from '@/common/helpers'
import { Logger } from '@/common/logger'
import { FireSpreadsheet } from '../globals'
import { Table } from '../table/Table'
import type { CellValue } from '../table/types'
import type {
  ImportRule,
  RuleAction,
  RuleCondition,
  RulePhase,
  RuleWarning,
} from './types'
import {
  ACTIONS_REQUIRING_VALUE,
  CONDITIONS_REQUIRING_VALUE,
  NUMERIC_ACTIONS,
  VALID_ACTIONS,
  VALID_CONDITIONS,
  VALID_PHASES,
} from './types'

const IMPORT_RULES_SHEET_NAME = 'import-rules'
const RULES_CACHE_KEY = 'cache.importRules'

interface LoadResult {
  rules: ImportRule[]
  warnings: RuleWarning[]
}

let rulesCache: LoadResult | null = null

function parseBoolean(value: CellValue): boolean {
  return String(value ?? '').toLowerCase() === 'true'
}

function parseBanks(value: CellValue): string[] {
  return String(value ?? '')
    .split(',')
    .map(b => slugify(b.trim()))
    .filter(Boolean)
}

type PartialRule = Partial<ImportRule> & { ruleName: string, rowIndex: number }

type ValidationCheck = (rule: PartialRule) => string | null

const validationChecks: ValidationCheck[] = [
  rule => !rule.conditionColumn ? 'Missing condition column' : null,
  rule => (!rule.condition || !VALID_CONDITIONS.includes(rule.condition))
    ? `Invalid condition: "${rule.condition ?? ''}"`
    : null,
  rule => (!rule.action || !VALID_ACTIONS.includes(rule.action))
    ? `Invalid action: "${rule.action ?? ''}"`
    : null,
  rule => (!rule.rulePhase || !VALID_PHASES.includes(rule.rulePhase))
    ? `Invalid rule phase: "${rule.rulePhase ?? ''}"`
    : null,
  rule => (rule.condition && CONDITIONS_REQUIRING_VALUE.includes(rule.condition) && !rule.conditionValue)
    ? `Condition "${rule.condition}" requires a condition value`
    : null,
  rule => (rule.action && ACTIONS_REQUIRING_VALUE.includes(rule.action) && !rule.actionValue)
    ? `Action "${rule.action}" requires an action value`
    : null,
  rule => (rule.action && NUMERIC_ACTIONS.includes(rule.action) && rule.actionValue && Number.isNaN(Number(rule.actionValue)))
    ? `Action "${rule.action}" requires a numeric action value, got "${rule.actionValue}"`
    : null,
  rule => (!rule.banks || rule.banks.length === 0) ? 'Missing bank(s)' : null,
]

function validateRule(
  rule: PartialRule,
  warnings: RuleWarning[],
): rule is ImportRule {
  for (const check of validationChecks) {
    const error = check(rule)
    if (error) {
      warnings.push({ ruleName: rule.ruleName, rowIndex: rule.rowIndex, message: error })
      return false
    }
  }
  return true
}

function parseRuleRow(row: CellValue[], rowIndex: number): Partial<ImportRule> & { ruleName: string, rowIndex: number } {
  const conditionColumn = String(row[2] ?? '').trim()
  const actionColumn = String(row[6] ?? '').trim()

  return {
    ruleName: String(row[0] ?? '').trim(),
    banks: parseBanks(row[1]),
    conditionColumn,
    condition: String(row[3] ?? '').trim().toUpperCase() as RuleCondition,
    conditionValue: String(row[4] ?? '').trim() || undefined,
    action: String(row[5] ?? '').trim().toUpperCase() as RuleAction,
    actionColumn: actionColumn || conditionColumn,
    actionValue: String(row[7] ?? '').trim() || undefined,
    stopProcessing: parseBoolean(row[8]),
    rulePhase: String(row[9] ?? '').trim().toUpperCase() as RulePhase,
    rowIndex,
  }
}

function loadFromSheet(): LoadResult {
  const sheet = FireSpreadsheet.getSheetByName(IMPORT_RULES_SHEET_NAME)

  if (!sheet) {
    Logger.log(`Sheet "${IMPORT_RULES_SHEET_NAME}" not found, no import rules loaded`)
    return { rules: [], warnings: [] }
  }

  const rawValues = sheet.getSheetValues(1, 1, sheet.getLastRow(), -1) as CellValue[][]
  const table = Table.from(rawValues)

  // Shift header row
  table.shiftRow()

  const rules: ImportRule[] = []
  const warnings: RuleWarning[] = []

  for (let i = 0; i < table.getData().length; i++) {
    const row = table.getData()[i]
    const ruleName = String(row[0] ?? '').trim()

    // Skip blank rows
    if (!ruleName) continue

    // rowIndex is i + 2: +1 for 0-indexing, +1 for the header row
    const parsed = parseRuleRow(row, i + 2)

    if (validateRule(parsed, warnings)) {
      rules.push(parsed)
    }
  }

  return { rules, warnings }
}

/**
 * Loads import rules from the "import-rules" sheet.
 * Uses in-memory and document cache (30s TTL) to avoid repeated reads.
 */
export function loadImportRules(): LoadResult {
  if (rulesCache) {
    return rulesCache
  }

  try {
    const cache = CacheService.getDocumentCache()
    const cached = cache.get(RULES_CACHE_KEY)

    if (cached) {
      try {
        const parsed = JSON.parse(cached) as LoadResult
        rulesCache = parsed
        return parsed
      }
      catch {
        Logger.warn('Failed to parse cached import rules')
      }
    }
  }
  catch {
    // CacheService may not be available in all contexts
  }

  const result = loadFromSheet()

  try {
    const cache = CacheService.getDocumentCache()
    cache.put(RULES_CACHE_KEY, JSON.stringify(result), 30)
  }
  catch {
    // CacheService may not be available
  }

  rulesCache = result
  return result
}

/**
 * Filters rules to those applicable for a given bank account.
 * Matches on "all" or slugified bank account ID.
 */
export function getRulesForBank(rules: ImportRule[], bankAccountId: string): ImportRule[] {
  const slugifiedId = slugify(bankAccountId)
  return rules.filter(rule =>
    rule.banks.includes('all') || rule.banks.includes(slugifiedId),
  )
}

/**
 * Filters rules by their processing phase.
 */
export function getRulesForPhase(rules: ImportRule[], phase: RulePhase): ImportRule[] {
  return rules.filter(rule => rule.rulePhase === phase)
}

/**
 * Clears the in-memory rule cache. Used for testing.
 */
export function clearRulesCache(): void {
  rulesCache = null
}
