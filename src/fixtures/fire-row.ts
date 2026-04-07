import { FIRE_COLUMNS, type FireColumn } from "@/common/constants";

/**
 * Builds a FIRE-format string row (`string[]`) suitable for use in a `RawTable`.
 * All columns follow the FIRE_COLUMNS order. Accepts partial overrides for
 * any FIRE column; unspecified columns receive sensible defaults.
 */
export const buildFireTableRow = (overrides: Partial<Record<FireColumn, string>> = {}): string[] => {
  const defaults: Record<FireColumn, string> = {
    ref: 'ref-001',
    iban: 'NL01TEST0000000001',
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
  };
  const merged = { ...defaults, ...overrides };
  return FIRE_COLUMNS.map(col => merged[col]);
};
