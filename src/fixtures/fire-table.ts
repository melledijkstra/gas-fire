import type { CellValue } from '@/server/table'

export const fireTableMock: CellValue[][] = [
  // data follows FIRE_COLUMNS format
  // 'ref',   'iban',               'date',      'amount','balance','contra_account',   'description',      'comments',             'icon','category', 'label',     'import_date','hours','disabled','contra_iban','currency'
  ['ref_001', 'NL01BANK0123456789', '2024-01-15', -45.5, 1250.75, 'Supermarket Alpha', 'Weekly groceries', 'Shared with roommate', '🛒', 'Groceries', 'Essential', '2024-01-16', '', false, 'NL99REVO0987654321', 'EUR'],
  ['ref_002', 'NL01BANK0123456789', '2024-01-14', 2500, 1296.25, 'Tech Corp Intl', 'Monthly Salary', '', '💰', 'Income', 'Work', '2024-01-16', 160, false, 'DE88BANK0112233445', 'EUR'],
  ['ref_003', 'NL01BANK0123456789', '2024-01-13', -12.99, -1203.75, 'Streaming Service', 'Monthly subscription', '', '📺', 'Entertainment', 'Subscription', '2024-01-16', '', false, '', 'EUR'],
  ['ref_004', 'NL01BANK0123456789', '2024-01-12', -850, -353.75, 'Apartment Management', 'Monthly Rent', 'January rent', '🏠', 'Housing', 'Fixed', '2024-01-16', '', false, 'NL22BANK0111222333', 'EUR'],
  ['ref_005', 'NL01BANK0123456789', '2024-01-11', -35.2, 496.25, 'Gas Station Delta', 'Fuel', '', '🚗', 'Transport', 'Essential', '2024-01-16', '', false, '', 'EUR'],
  ['ref_006', 'NL01BANK0123456789', '2024-01-10', -6.5, 531.45, 'Coffee House', 'Morning Latte', '', '☕', 'Dining Out', 'Leisure', '2024-01-16', '', false, '', 'EUR'],
  ['ref_007', 'NL01BANK0123456789', '2024-01-09', 120, 537.95, 'Marketplace Sales', 'Sold old monitor', 'Second hand sale', '📦', 'Income', 'Extra', '2024-01-16', '', false, 'NL55INGB0001112223', 'EUR'],
]
