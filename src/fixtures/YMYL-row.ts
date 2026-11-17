import { type YMYLColumn, YMYL_COLUMNS } from '@/common/constants'
import type { CellValue } from '@/common/types'

/**
 * Builds a YMYL-format string row (`string[]`) suitable for use in a `RawTable`.
 * All columns follow the YMYL_COLUMNS order. Accepts partial overrides for
 * any YMYL column; unspecified columns receive sensible defaults.
 */
export const buildYMYLTableRow = (overrides: Partial<Record<YMYLColumn, string>> = {}): string[] => {
  const defaults: Record<YMYLColumn, string> = {
    ref: 'ref-001',
    iban: 'TEST01TEST0000000001',
    date: '2023-01-01',
    amount: '0',
    balance: '',
    contra_account: 'Test Account',
    description: 'Test Transaction',
    comments: '',
    icon: '',
    category: '',
    label: '',
    import_date: '',
    hours: '',
    disabled: '',
    contra_iban: '',
    currency: 'EUR',
  }
  const merged = { ...defaults, ...overrides }
  return YMYL_COLUMNS.map(col => merged[col])
}

/**
 * Builds a YMYL-format typed cell row (`CellValue[]`) representing a row in the `source` sheet.
 */
export const buildYMYLCellRow = (overrides: Partial<Record<YMYLColumn, CellValue>> = {}): CellValue[] => {
  const defaults: Record<YMYLColumn, CellValue> = {
    ref: 'ref-1',
    iban: 'TEST01BANK0000000001',
    date: new Date(2026, 10, 15),
    amount: -25.5,
    balance: 1000,
    contra_account: 'Supermarket X',
    description: 'Groceries purchase',
    comments: '',
    icon: '🛒',
    category: 'Food & Groceries',
    label: '',
    import_date: new Date(2026, 10, 16),
    hours: -1,
    disabled: false,
    contra_iban: '',
    currency: 'EUR',
  }
  return YMYL_COLUMNS.map(col => overrides[col] ?? defaults[col])
}
