import { type YMYLColumn, YMYL_COLUMNS } from '@/common/constants'

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
