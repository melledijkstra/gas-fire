import { describe, expect, it, vi } from 'vitest'
import { FireTableFactory } from './fire-table-factory'
import { Config } from '../config'
import type { RawTable } from '@/common/types'
import { AccountUtils } from '../accounts/account-utils'
import { N26ImportMock } from '@/fixtures/n26'
import { FireTable } from '@/common/table/FireTable'

describe('FireTableFactory.fromAccountSpecification', () => {
  it('should return empty result if no rows are provided neither columnMap', () => {
    const result = FireTableFactory.fromAccountSpecification({
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

    const result = FireTableFactory.fromAccountSpecification({
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

    const result = FireTableFactory.fromAccountSpecification({ headers, rows, config })

    const descriptionIndex = FireTable.getFireColumnIndex('description')
    expect(result.data[0][descriptionIndex]).toBe(null)
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

    const result = FireTableFactory.fromAccountSpecification({ headers, rows, config })
    const data = result.data

    expect(result.getRowCount()).toBe(2)
    expect(data[0][FireTable.getFireColumnIndex('date')]).toStrictEqual(
      new Date(2024, 0, 1),
    )
    expect(data[0][FireTable.getFireColumnIndex('amount')]).toBe(100)
    expect(data[0][FireTable.getFireColumnIndex('description')]).toBe(
      'Test payment 1',
    )
    expect(data[0][FireTable.getFireColumnIndex('iban')]).toBe(
      'NL01BANK0123456789',
    )

    expect(data[1][FireTable.getFireColumnIndex('date')]).toStrictEqual(
      new Date(2024, 0, 2),
    )
    expect(data[1][FireTable.getFireColumnIndex('amount')]).toBe(200)
    expect(data[1][FireTable.getFireColumnIndex('description')]).toBe(
      'Test payment 2',
    )
    expect(data[1][FireTable.getFireColumnIndex('iban')]).toBe(
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

    const result = FireTableFactory.fromAccountSpecification({
      config: n26Config,
      headers,
      rows,
    })
    const data = result.data

    expect(result.getRowCount()).toBe(4)
    expect(data[0][FireTable.getFireColumnIndex('date')]).toStrictEqual(
      new Date(2023, 10, 26),
    )
    expect(data[0][FireTable.getFireColumnIndex('amount')]).toBe(-11.63)
    expect(data[0][FireTable.getFireColumnIndex('contra_account')]).toBe(
      'Supermarket X',
    )
    expect(data[0][FireTable.getFireColumnIndex('description')]).toBe(
      'Ticket is attached to the email',
    )
    expect(data[0][FireTable.getFireColumnIndex('iban')]).toBe('ES12345678910')
  })
})
