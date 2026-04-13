import type { CellValue } from './types'
import { FIRE_COLUMNS } from './constants'
import { HASH_COLUMNS } from './settings'

const hashColumns = HASH_COLUMNS.map(col => Array.from(FIRE_COLUMNS).indexOf(col))

export const slugify = (text: string): string =>
  text.trim() // trim leading/trailing white space
    .toLowerCase() // convert string to lowercase
    .replaceAll(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
    .replaceAll(/\s+/g, '-') // replace spaces with hyphens
    .replaceAll(/-+/g, '-') // remove consecutive hyphens

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export function structuredCloneFallback<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return input
  }

  if (Array.isArray(input)) {
    return input.map(item => structuredCloneFallback(item)) as T
  }

  if (input instanceof Date) {
    return new Date(input) as T
  }

  if (input instanceof RegExp) {
    return new RegExp(input) as T
  }

  if (input instanceof Map) {
    const clone = new Map()
    for (const [key, value] of input) {
      clone.set(structuredCloneFallback(key), structuredCloneFallback(value))
    }
    return clone as T
  }

  if (input instanceof Set) {
    const clone = new Set()
    for (const value of input) {
      clone.add(structuredCloneFallback(value))
    }
    return clone as T
  }

  if (isRecord(input)) {
    const clonedObject: Record<string, unknown> = {}
    for (const key in input) {
      if (Object.hasOwn(input, key)) {
        clonedObject[key] = structuredCloneFallback(input[key])
      }
    }
    return clonedObject as T
  }

  return input
}

export function structuredClone<T>(input: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(input)
  }

  return structuredCloneFallback(input)
}

export function getRowHash(row: CellValue[]): string {
  return hashColumns.map((colIndex) => {
    const cell = row[colIndex]
    return cell instanceof Date ? cell.toISOString() : String(cell ?? '')
  }).join('|')
}
