import { test, expect, describe } from 'vitest';
import { Utils } from './utils';
import { SOURCE_SHEET_ID, getSheetById } from './globals';
import { RangeMock, SheetMock } from '../../test-setup';

describe('Utility tests', () => {
  test('Transformers.transformMoney', () => {
    RangeMock.getValues.mockReturnValueOnce([
      ['DEUTSCHE_BANK', 'DB123456789'],
      ['SOMEOTHER_BANK', 'BANK123456789'],
    ]);

    expect(Utils.getBankAccounts()).toStrictEqual({
      DEUTSCHE_BANK: 'DB123456789',
      SOMEOTHER_BANK: 'BANK123456789',
    });
  });

  test('getSheetById', () => {
    SheetMock.getSheetId.mockReturnValueOnce(SOURCE_SHEET_ID);

    expect(getSheetById(SOURCE_SHEET_ID)).toBe(SheetMock);
  });
});
