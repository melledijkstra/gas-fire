import { test, expect, describe } from 'vitest';
import { AccountUtils } from './account-utils';
import { SOURCE_SHEET_ID, getSheetById } from './globals';
import { RangeMock, SheetMock } from '../../test-setup';
import { StrategyOption } from '../common/types';

describe('Utility tests', () => {
  test('Transformers.transformMoney', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['DEUTSCHE_BANK', 'DB123456789'],
      ['SOMEOTHER_BANK', 'BANK123456789'],
      ['', ''],
    ]);

    expect(AccountUtils.getBankAccounts()).toStrictEqual({
      DEUTSCHE_BANK: 'DB123456789',
      SOMEOTHER_BANK: 'BANK123456789',
    });
  });

  test('getSheetById', () => {
    SheetMock.getSheetId.mockReturnValueOnce(SOURCE_SHEET_ID);

    expect(getSheetById(SOURCE_SHEET_ID)).toBe(SheetMock);
  });

  test.only('retrieve the balance of a specific bank', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['n26', 'DB123456789', '302.80'],
      ['Openbank', 'BANK123456789', '400'],
      ['', '', ''],
    ]);

    expect(AccountUtils.getBalance(StrategyOption.N26)).toBe(302.8);
  });
});
