import { generatePreview, importCSV } from './remote-calls';
import type { Table } from '@/common/types';
import { RangeMock, SheetMock } from '../../test-setup';
import { N26ImportMock } from '@/fixtures/n26';
import { fakeTestBankImportData } from '@/fixtures/test-bank';
import { TableUtils } from './table-utils';
import { raboImportMock } from '@/fixtures/rabobank';
import { Config } from './config';
import { Logger } from '@/common/logger';
import { getSourceSheet } from './globals';
import bankOfAmericaCSV from '@/fixtures/bank-of-america.csv?raw';
import Papa from 'papaparse';
import { getSpreadsheetLocale } from './utils/spreadsheet';

vi.mock('./globals')
vi.mock('./utils/spreadsheet')

const getSpreadsheetLocaleMock = vi.mocked(getSpreadsheetLocale);

const getSourceSheetMock = vi.mocked(getSourceSheet);

const importDataSpy = vi.spyOn(TableUtils, 'importData');
const configSpy = vi.spyOn(Config, 'getAccountConfiguration');

const BANK_ID = 'test-bank';

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
        fakeTestBankImportData,
        BANK_ID
      );

      expect(result).toStrictEqual(fakeTestBankImportData);
      expect(newBalance).toBe(358.55);
    });
  });

  describe('importCSV', () => {
    beforeAll(() => {
      Logger.disable();
    })

    beforeEach(() => {
      importDataSpy.mockClear();
    })

    test('handles empty import', () => {
      const result = importCSV([], BANK_ID);

      expect(importDataSpy).not.toHaveBeenCalled();
      expect(result.message).toBe('No rows to import, check your import data or rules!');
    })

    test('removes filters if any are set', () => {
      getSourceSheetMock.mockReturnValueOnce(SheetMock)

      importCSV([], 'test-bank')

      expect(SheetMock.getFilter).toHaveBeenCalled();
    });

    test('is able to handle N26 import', () => {
      const n26Config = new Config({
        accountId: 'n26',
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

      const result = importCSV(N26ImportMock, 'n26')

      expect(importDataSpy).toHaveBeenCalled()
      expect(result.message).toBe('imported 4 rows!')
    });

    test('is able to handle rabobank import', () => {
      const result = importCSV(raboImportMock, 'rabobank');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 1 rows!');
    });

    test('is able to handle bank of america', () => {
      getSpreadsheetLocaleMock.mockReturnValueOnce('en-US')

      const bankOfAmericaConfig = new Config({
        accountId: 'bank-of-america',
        columnMap: {
          amount: 'Amount',
          date: 'Date',
          description: 'Description'
        }
      })

      const { data } = Papa.parse(bankOfAmericaCSV)

      configSpy.mockReturnValue(bankOfAmericaConfig)

      const result = importCSV(data as Table, 'bank-of-america')

      expect(importDataSpy).toHaveBeenCalled()
      expect(importDataSpy).toHaveBeenCalledWith(expect.arrayContaining([
        expect.arrayContaining([new Date('2023-09-12'),-100,'Utility Bill Payment']),
      ]));
      expect(result.message).toBe('imported 5 rows!')
    })

    test('sorts by date before importing', () => {
      const testBankConfig = new Config({
        accountId: BANK_ID,
        columnMap: {
          amount: 'TransactionAmount',
          date: 'TransactionDate'
        }
      });

      configSpy.mockReturnValue(testBankConfig);

      importCSV(fakeTestBankImportData, BANK_ID);

      expect(importDataSpy).toHaveBeenCalled();
      expect(importDataSpy).toHaveBeenCalledWith([
        expect.arrayContaining([new Date('2016-01-23'), -25.6]),
        expect.arrayContaining([new Date('2015-05-21'), 58.3]),
        expect.arrayContaining([new Date('2015-05-20'), 20]),
      ]);
    });
  });
});
