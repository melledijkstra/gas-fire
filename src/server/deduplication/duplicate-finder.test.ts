import { describe, expect } from 'vitest'
import { findDuplicates, getRowHash } from './duplicate-finder'
import type { RawTable } from '@/common/types'
import type { CellValue } from '../table'
import { buildFireTableRow } from '@/fixtures/fire-row'
import { FIRE_COLUMNS } from '@/common/constants'

const days = (days: number) => days * 24 * 60 * 60 * 1000

describe('getRowHash', () => {
  test('should generate a hash', () => {
    const row: CellValue[] = buildFireTableRow({ iban: 'TEST01TT0123456789', date: '2024-01-01T00:00:00.000Z', amount: '-1.25' })
    const hash = getRowHash(row)
    expect(hash).toBe('TEST01TT0123456789|2024-01-01T00:00:00.000Z|-1.25|Test Account|Test Transaction')
  })
})

describe('findDuplicates', () => {
  test('should find duplicates within the specified timespan', () => {
    // alice1 and alice2 share the same hash (same iban, date, amount, contra_account, description)
    const alice1 = buildFireTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
    const alice2 = buildFireTableRow({ ref: '2', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
    const bob = buildFireTableRow({ ref: '3', iban: 'BOB-IBAN', date: '2023-01-01', amount: '-30' })

    const table = [[...FIRE_COLUMNS], alice1, alice2, bob]
    const duplicates = findDuplicates(table, days(2))
    expect(duplicates).toEqual([alice1, alice2])
  })

  test('should not find duplicates if timespan is exceeded', () => {
    // Different dates produce different hashes, so no match regardless of timespan
    const alice_day1 = buildFireTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
    const alice_day3 = buildFireTableRow({ ref: '2', iban: 'ALICE-IBAN', date: '2023-01-03', amount: '-1.25' })
    const bob = buildFireTableRow({ ref: '3', iban: 'BOB-IBAN', date: '2023-01-01', amount: '-1.25' })

    const table = [[...FIRE_COLUMNS], alice_day1, alice_day3, bob]
    const duplicates = findDuplicates(table, days(1))
    expect(duplicates).toEqual([])
  })

  test('should handle an empty table', () => {
    const table: RawTable = []
    const timespan = days(1)
    const duplicates = findDuplicates(table, timespan)
    expect(duplicates).toEqual([])
  })

  test('should handle a table with only headers', () => {
    const table = [[...FIRE_COLUMNS]]
    const timespan = days(1)
    const duplicates = findDuplicates(table, timespan)
    expect(duplicates).toEqual([])
  })

  test('should find multiple sets of duplicates', () => {
    // alice1+alice2 are duplicates; bob1+bob2 are duplicates; john rows have different dates
    const alice1 = buildFireTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
    const alice2 = buildFireTableRow({ ref: '2', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })
    const john1 = buildFireTableRow({ ref: '3', iban: 'JOHN-IBAN', date: '2023-01-01', amount: '-5' })
    const bob1 = buildFireTableRow({ ref: '4', iban: 'BOB-IBAN', date: '2023-01-01', amount: '100' })
    const bob2 = buildFireTableRow({ ref: '5', iban: 'BOB-IBAN', date: '2023-01-01', amount: '100' })
    const john2 = buildFireTableRow({ ref: '6', iban: 'JOHN-IBAN', date: '2023-01-05', amount: '-5' })
    const bob3 = buildFireTableRow({ ref: '7', iban: 'BOB-IBAN', date: '2023-01-07', amount: '100' })

    const table = [[...FIRE_COLUMNS], alice1, alice2, john1, bob1, bob2, john2, bob3]
    const duplicates = findDuplicates(table, days(1))
    expect(duplicates).toEqual([alice1, alice2, bob1, bob2])
  })

  test('should return unique rows when 3 duplicates exist', () => {
    const base = { iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' }
    const row1 = buildFireTableRow({ ref: '1', ...base })
    const row2 = buildFireTableRow({ ref: '2', ...base })
    const row3 = buildFireTableRow({ ref: '3', ...base })

    const table = [[...FIRE_COLUMNS], row1, row2, row3]
    const duplicates = findDuplicates(table, days(1))

    expect(duplicates.length).toBe(3)
    const refs = duplicates.map(r => r[0])
    expect(new Set(refs).size).toBe(3)
  })

  test('should return unique rows when 3 duplicates exist (identical content)', () => {
    const idRow = buildFireTableRow({ ref: '1', iban: 'ALICE-IBAN', date: '2023-01-01', amount: '-1.25' })

    const table = [[...FIRE_COLUMNS], idRow, idRow, idRow]
    const duplicates = findDuplicates(table, days(1))

    expect(duplicates.length).toBe(3)
  })
})
