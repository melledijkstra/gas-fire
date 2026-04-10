import { AccountUtils, isNumeric } from './account-utils'
import { RangeMock } from '../../../test-setup'

describe('Utility tests', () => {
  test('getBankAccounts', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['Deutsche Bank', 'DB123456789'],
      ['n26', 'BANK123456789'],
      ['Banco de España', 'BANK124463534'],
      ['', ''],
    ])

    expect(AccountUtils.getBankAccounts()).toStrictEqual({
      'deutsche-bank': 'DB123456789',
      'n26': 'BANK123456789',
      'banco-de-espaa': 'BANK124463534',
    })
  })

  test('retrieve the balance of a specific bank', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['N26', 'DB123456789', '302.80'],
      ['Openbank', 'BANK123456789', '400'],
      ['', '', ''],
    ])

    expect(AccountUtils.getBalance('n26')).toBe(302.8)
  })

  test('should throw an error if account is not found', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['N26', 'DB123456789', '302.80'],
    ])

    expect(() => AccountUtils.getBalance('openbank')).toThrow(
      'Account \'openbank\' not found',
    )
  })
})

describe('calculateNewBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('should calculate the new balance by adding all values', () => {
    const getBalanceSpy = vi.spyOn(AccountUtils, 'getBalance').mockReturnValue(100.50)

    const newBalance = AccountUtils.calculateNewBalance('my-bank', [50.25, -20.00, 10.00])

    expect(getBalanceSpy).toHaveBeenCalledWith('my-bank')
    expect(newBalance).toBeCloseTo(140.75, 2)
  })

  test('should return the current balance when values array is empty', () => {
    const getBalanceSpy = vi.spyOn(AccountUtils, 'getBalance').mockReturnValue(100.50)

    const newBalance = AccountUtils.calculateNewBalance('my-bank', [])

    expect(getBalanceSpy).toHaveBeenCalledWith('my-bank')
    expect(newBalance).toBeCloseTo(100.50, 2)
  })
})

describe('isNumeric', () => {
  test('should return true for numbers', () => {
    expect(isNumeric(123)).toBe(true)
    expect(isNumeric(0)).toBe(true)
    expect(isNumeric(-1.5)).toBe(true)
  })

  test('should return true for numeric strings', () => {
    expect(isNumeric('123')).toBe(true)
    expect(isNumeric('0')).toBe(true)
    expect(isNumeric('-1.5')).toBe(true)
  })

  test('should return false for non-numeric strings', () => {
    expect(isNumeric('abc')).toBe(false)
    expect(isNumeric('12a')).toBe(false)
    expect(isNumeric(' ')).toBe(false)
  })

  test('should return false for empty or nullish values', () => {
    expect(isNumeric('')).toBe(false)
    expect(isNumeric(null)).toBe(false)
    expect(isNumeric(undefined)).toBe(false)
  })

  test('should return false for objects and arrays', () => {
    expect(isNumeric({})).toBe(false)
    expect(isNumeric([])).toBe(false)
    expect(isNumeric([1])).toBe(false)
  })

  test('should return false for booleans', () => {
    expect(isNumeric(true)).toBe(false)
    expect(isNumeric(false)).toBe(false)
  })
})
