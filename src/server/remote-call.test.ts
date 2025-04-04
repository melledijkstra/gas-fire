import { generatePreview, processCSV } from './remote-calls';
import type { Table } from '@/common/types';
import { RangeMock, SheetMock } from '../../test-setup';
import { N26ImportMock } from '@/fixtures/n26';
import { fakeTestBankImportWithBalance } from '@/fixtures/test-bank';
import { TableUtils } from './table-utils';
import { raboImportMock } from '@/fixtures/rabobank';
import { Config } from './config';
import { Logger } from '@/common/logger';
import { getSourceSheet } from './globals';

vi.mock('./globals')

const getSourceSheetMock = vi.mocked(getSourceSheet);

const importDataSpy = vi.spyOn(TableUtils, 'importData');
const configSpy = vi.spyOn(Config, 'getAccountConfiguration');

const BANK_ID = 'TestBank';

describe('Remote Calls', () => {
  beforeAll(() => {
    const testBankConfig = new Config({
      accountId: BANK_ID,
      columnMap: {
        amount: 'TransactionAmount'
      }
    });
    configSpy.mockReturnValue(testBankConfig);
  })

  describe('generatePreview', () => {
    test('is able to handle table without any useful data and should return the current balance', () => {
      RangeMock.getValues.mockReturnValueOnce([        
        ['Openbank', 'BANK123456789', '400'],
        [BANK_ID, 'DB123456789', '302.80'],
        ['', '', ''],
      ]);

      const table: Table = [['', '', '', '', '', ''], []];
      const { result, newBalance } = generatePreview(table, BANK_ID);

      expect(result).toStrictEqual(table);
      expect(newBalance).toBe(302.8);
    });

    test('calculates new balance when there is useful data in the amounts column', () => {
      RangeMock.getValues.mockReturnValueOnce([
        ['Openbank', 'BANK123456789', '400'],
        [BANK_ID, 'DB123456789', '305.85'],
        ['', '', ''],
      ]);

      const { result, newBalance } = generatePreview(
        fakeTestBankImportWithBalance,
        BANK_ID
      );

      expect(result).toStrictEqual(fakeTestBankImportWithBalance);
      expect(newBalance).toBe(358.55);
    });
  });

  describe('processCSV', () => {
    beforeAll(() => {
      Logger.disable();
    })

    beforeEach(() => {
      importDataSpy.mockClear();
    });

    test('handles empty import', () => {
      const result = processCSV([], BANK_ID);

      expect(importDataSpy).not.toHaveBeenCalled();
      expect(result.message).toBe('No rows to import, check your import data or rules!');
    })

    test('removes filters if any are set', () => {
      getSourceSheetMock.mockReturnValueOnce(SheetMock)

      processCSV([], 'TestBank')

      expect(SheetMock.getFilter).toHaveBeenCalled();
    });

    test('is able to handle N26 import', () => {
      const n26Config = new Config({
        accountId: 'N26',
        columnMap: {
          amount: 'Amount',
          date: 'Date',
          contra_account: 'Payee',
          contra_iban: 'Account number',
          currency: 'Type Foreign Currency',
          description: 'Payment reference'
        }
      })

      configSpy.mockReturnValue(n26Config)

      const result = processCSV(N26ImportMock, 'N26')

      expect(importDataSpy).toHaveBeenCalled()
      expect(result.message).toBe('imported 4 rows!')
    });

    test('is able to handle rabobank import', () => {
      const result = processCSV(raboImportMock, 'rabobank');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 1 rows!');
    });
  });
});
