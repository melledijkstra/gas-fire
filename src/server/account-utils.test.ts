import { AccountUtils, isNumeric } from './account-utils';
import { getSheetById } from './globals';
import { RangeMock, SheetMock } from '../../test-setup';
import { SOURCE_SHEET_ID } from '@/common/constants';

describe('Utility tests', () => {
  test('getBankAccounts', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['Deutsche Bank', 'DB123456789'],
      ['n26', 'BANK123456789'],
      ['Banco de España', 'BANK124463534'],
      ['', ''],
    ]);

    expect(AccountUtils.getBankAccounts()).toStrictEqual({
      'deutsche-bank': 'DB123456789',
      'n26': 'BANK123456789',
      "banco-de-espaa": "BANK124463534"
    });
  });

  test('getSheetById', () => {
    SheetMock.getSheetId.mockReturnValueOnce(SOURCE_SHEET_ID);

    expect(getSheetById(SOURCE_SHEET_ID)).toBe(SheetMock);
  });

  test('retrieve the balance of a specific bank', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['N26', 'DB123456789', '302.80'],
      ['Openbank', 'BANK123456789', '400'],
      ['', '', ''],
    ]);

    expect(AccountUtils.getBalance('n26')).toBe(302.8);
  });
});

describe('isNumeric', () => {
  test('should return true for numbers', () => {
    expect(isNumeric(123)).toBe(true);
    expect(isNumeric(0)).toBe(true);
    expect(isNumeric(-1.5)).toBe(true);
  });

  test('should return true for numeric strings', () => {
    expect(isNumeric('123')).toBe(true);
    expect(isNumeric('0')).toBe(true);
    expect(isNumeric('-1.5')).toBe(true);
  });

  test('should return false for non-numeric strings', () => {
    expect(isNumeric('abc')).toBe(false);
    expect(isNumeric('12a')).toBe(false);
    expect(isNumeric(' ')).toBe(false);
  });

  test('should return false for empty or nullish values', () => {
    expect(isNumeric('')).toBe(false);
    expect(isNumeric(null)).toBe(false);
    expect(isNumeric(undefined)).toBe(false);
  });

  test('should return false for objects and arrays', () => {
    expect(isNumeric({})).toBe(false);
    expect(isNumeric([])).toBe(false);
    expect(isNumeric([1])).toBe(false);
  });

  test('should return false for booleans', () => {
    expect(isNumeric(true)).toBe(false);
    expect(isNumeric(false)).toBe(false);
  });
});
