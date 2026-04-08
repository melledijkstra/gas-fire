import type { RawTable } from '@/common/types'

// prettier-ignore
export const LargeImportMock: RawTable = [
  ['Date', 'Payee', 'Account number', 'Transaction type', 'Payment reference', 'Amount', 'Amount (Foreign Currency)', 'Type Foreign Currency', 'Exchange Rate'],
  ['2023-11-26', 'Supermarket X', '', 'MasterCard Payment', 'Ticket is attached to the email', '-11.63', '-11.63', 'EUR', '1.0'],
  ['2023-11-26', 'Restaurant X', '', 'MasterCard Payment', '', '-13.08', '-13.08', 'EUR', '1.0'],
  ['2023-11-26', 'Restaurant XXI', '', 'MasterCard Payment', '-', '-26.5', '-26.5', 'EUR', '1.0'],
  ['2023-11-26', 'Supermarket Y', '', 'MasterCard Payment', '', '-9.3', '-9.3', 'EUR', '1.0'],
  ['2024-10-26', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-25', 'Car Rental', '', 'Presentment', '', '-400', '40', 'EUR', '1.0'],
  ['2024-10-26', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-26', '', '', 'Credit Transfer', 'Restaurant X', '22.5', '', ''],
  ['2024-10-27', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-27', 'Supermarket X', '', 'Presentment', '', '-15.62', '15.62', 'EUR', '1.0'],
  ['2024-10-27', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-27', 'Restaurant Y', '', 'Presentment', '', '-45', '45', 'EUR', '1.0'],
  ['2024-10-29', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-29', 'SomeCompany', 'XX12345678901', 'Credit Transfer', 'No.12000/', '4100.27', '', ''],
  ['2024-10-30', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-29', 'Amazon', '', 'Presentment', '', '-18.62', '18.62', 'EUR', '1.0'],
  ['2024-10-30', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-30', 'Amazon', '', 'Presentment Refund', '', '18.4', '18.4', 'EUR', '1.0'],
  ['2024-10-30', 'Car Rental', '', 'MasterCard Payment', '', '-400', '-400', 'EUR', '1.0'],
  ['2024-10-30', 'Phone Company', 'XX12345678901234567890', 'Direct Debit', 'Phone Invoice', '-31.00', '', ''],
]
