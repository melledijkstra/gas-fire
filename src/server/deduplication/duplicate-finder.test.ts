import { describe, expect } from 'vitest'
import { getRowHash } from '@/common/helpers'
import type { CellValue } from '@/common/types'
import { buildFireTableRow } from '@/fixtures/fire-row'

describe('getRowHash', () => {
  test('should generate a hash', () => {
    const row: CellValue[] = buildFireTableRow({ iban: 'TEST01TT0123456789', date: '2024-01-01T00:00:00.000Z', amount: '-1.25' })
    const hash = getRowHash(row)
    expect(hash).toBe('TEST01TT0123456789|2024-01-01T00:00:00.000Z|-1.25|Test Account|Test Transaction')
  })
})
