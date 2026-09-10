import { describe, expect, it, vi } from 'vitest'
import { buildYMYLTable } from './YMYL-table-factory'
import { Config } from '../config'
import type { RawTable } from '@/common/types'
import { AccountUtils } from '../accounts/account-utils'
import { N26ImportMock } from '@/fixtures/n26'
import { YMYLTable } from '@/common/table/YMYLTable'

describe('YMYLTableFactory.fromAccountSpecification', () => {
  it('should return empty result if no rows are provided neither columnMap', () => {
    const result = buildYMYLTable({
      headers: [],
      rows: [],
      config: new Config({
        accountId: 'TestBank',
      }),
    })

    expect(result.getRowCount()).toBe(0)
  })

  it('should return correct shape when no column map is provided', () => {
    const rows: RawTable = [
      ['2022-01-01', '100', 'Checking', 'IBAN1234', 'USD'],
      ['2022-01-02', '200', 'Checking', 'IBAN1234', 'USD'],
    ]

    const config = new Config({
      accountId: 'TestBank',
    })

    const result = buildYMYLTable({
      headers: ['date', 'amount', 'accountName', 'iban', 'currency'],
      rows,
      config,
    })

    expect(result.getRowCount()).toBe(rows.length)
    expect(result.getColumnCount()).toBeGreaterThan(0)
  })

  it('should map empty strings to null instead of keeping them as empty strings', () => {
    const headers = ['Date', 'Amount', 'Description', 'IBAN']
    const rows: RawTable = [['2024-01-01', '100', '', 'NL01BANK001']]

    const config = new Config({
      accountId: 'TestBank',
      columnMap: {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
        iban: 'IBAN',
      },
    })

    const result = buildYMYLTable({ headers, rows, config })

    const descriptionIndex = YMYLTable.getYMYLColumnIndex('description')
    expect(result.data[0][descriptionIndex]).toBeNull()
  })

  it('should correctly import mapped data from input table when column map is provided', () => {
    vi.spyOn(AccountUtils, 'getAccountIban').mockReturnValueOnce(
      'NL01BANK0123456789',
    )

    const headers = ['Date', 'Amount', 'Description', 'IBAN']
    const rows: RawTable = [
      ['2024-01-01', '100,00', 'Test payment 1', 'NL02BANK001'],
      ['2024-01-02', '200,00', 'Test payment 2', 'NL02BANK001'],
    ]

    const config = new Config({
      accountId: 'TestBank',
      columnMap: {
        date: 'Date',
        amount: 'Amount',
        description: 'Description',
        iban: 'IBAN',
      },
    })

    const result = buildYMYLTable({ headers, rows, config })
    const data = result.data

    expect(result.getRowCount()).toBe(2)
    expect(data[0][YMYLTable.getYMYLColumnIndex('date')]).toStrictEqual(
      new Date(2024, 0, 1),
    )
    expect(data[0][YMYLTable.getYMYLColumnIndex('amount')]).toBe(100)
    expect(data[0][YMYLTable.getYMYLColumnIndex('description')]).toBe(
      'Test payment 1',
    )
    expect(data[0][YMYLTable.getYMYLColumnIndex('iban')]).toBe(
      'NL01BANK0123456789',
    )

    expect(data[1][YMYLTable.getYMYLColumnIndex('date')]).toStrictEqual(
      new Date(2024, 0, 2),
    )
    expect(data[1][YMYLTable.getYMYLColumnIndex('amount')]).toBe(200)
    expect(data[1][YMYLTable.getYMYLColumnIndex('description')]).toBe(
      'Test payment 2',
    )
    expect(data[1][YMYLTable.getYMYLColumnIndex('iban')]).toBe(
      'NL01BANK0123456789',
    )
  })

  it('should correctly import when simulating actual bank import', () => {
    vi.spyOn(AccountUtils, 'getAccountIban').mockReturnValueOnce(
      'ES12345678910',
    )

    const n26Config = new Config({
      columnMap: {
        ref: '',
        iban: '',
        date: 'Date',
        amount: 'Amount',
        balance: '',
        contra_account: 'Payee',
        description: 'Payment reference',
        comments: '',
        icon: '',
        category: '',
        label: '',
        import_date: '',
        hours: '',
        disabled: '',
        contra_iban: 'AccountNumber',
        currency: 'OriginalCurrency',
      },
      autoFillEnabled: true,
      autoCategorizationEnabled: true,
      autoFillColumnIndices: [1, 5, 9, 13, 14],
      accountId: 'n26',
    })

    const headers = N26ImportMock[0]
    const rows: RawTable = N26ImportMock.slice(1)

    const result = buildYMYLTable({
      config: n26Config,
      headers,
      rows,
    })
    const data = result.data

    expect(result.getRowCount()).toBe(4)
    expect(data[0][YMYLTable.getYMYLColumnIndex('date')]).toStrictEqual(
      new Date(2023, 10, 26),
    )
    expect(data[0][YMYLTable.getYMYLColumnIndex('amount')]).toBe(-11.63)
    expect(data[0][YMYLTable.getYMYLColumnIndex('contra_account')]).toBe(
      'Supermarket X',
    )
    expect(data[0][YMYLTable.getYMYLColumnIndex('description')]).toBe(
      'Ticket is attached to the email',
    )
    expect(data[0][YMYLTable.getYMYLColumnIndex('iban')]).toBe('ES12345678910')
  })
})
