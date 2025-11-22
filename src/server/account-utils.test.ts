import { AccountUtils } from './account-utils';
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

  test('should throw an error if account is not found', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['N26', 'DB123456789', '302.80'],
    ]);

    expect(() => AccountUtils.getBalance('openbank')).toThrow(
      "Account 'openbank' not found"
    );
  });
});
