import { getRowHash } from '@/common/helpers'
import type { YMYLTable } from '@/common/table/YMYLTable'
import type { Table } from '@/common/table/Table'
import type { TransactionAction, UserDecisions } from '@/common/types'
import type { Config } from '../config'
import { buildYMYLTable } from './YMYL-table-factory'

/**
 * removes empty rows from the input table in-place.
 */
export function removeEmptyRows(input: Table): Table {
  input.removeEmptyRows()
  return input
}

/**
 * transforms a Table into a YMYLTable using the account configuration.
 */
export function transformToYMYLTable(input: Table, config: Config): YMYLTable {
  if (!input.headers || input.headers.length === 0) {
    throw new Error('No header row detected in import data!')
  }

  return buildYMYLTable({
    headers: input.headers,
    rows: input.data,
    config,
  })
}

/**
 * detects duplicates in the table against a set of existing transaction hashes.
 * returns a set of duplicate hashes found in the input table.
 */
export function detectDuplicates(input: YMYLTable, existingHashes: Set<string>): Set<string> {
  const duplicates = new Set<string>()

  for (const row of input.data) {
    const hash = getRowHash(row)
    if (existingHashes.has(hash)) {
      duplicates.add(hash)
    }
  }

  return duplicates
}

/**
 * replaces empty cells in auto-fill columns with a placeholder for preview purposes.
 * autoFillColumns expects 1-based column indices.
 */
export function autoFillPreview<T extends YMYLTable>(input: T, autoFillColumns: number[]): T {
  if (autoFillColumns.length === 0) return input

  input.map((row) => {
    for (const colIndex of autoFillColumns) {
      const arrayIndex = colIndex - 1
      if (arrayIndex >= 0 && arrayIndex < row.length) {
        if (!row[arrayIndex] || row[arrayIndex] === '') {
          row[arrayIndex] = '(auto-filled)'
        }
      }
    }
    return row
  })

  return input
}

/**
 * filters rows based on explicit user decisions.
 * rows default to 'import' unless the user has explicitly decided otherwise.
 */
export function applyUserDecisions(
  input: YMYLTable,
  userDecisions?: UserDecisions | Record<string, TransactionAction>,
): YMYLTable {
  if (!userDecisions) return input

  const decisionsMap = userDecisions instanceof Map
    ? userDecisions
    : new Map(Object.entries(userDecisions))

  if (decisionsMap.size === 0) return input

  input.filter((row) => {
    const hash = getRowHash(row)
    const action: TransactionAction = decisionsMap.get(hash) ?? 'import'
    return action === 'import'
  })

  return input
}

/**
 * removes rows whose hash matches any hash in the excluded set.
 */
export function filterOutExcluded(input: YMYLTable, excludedHashes: Set<string>): YMYLTable {
  if (excludedHashes.size === 0) return input

  input.filter(row => !excludedHashes.has(getRowHash(row)))
  return input
}
