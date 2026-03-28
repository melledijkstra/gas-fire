import {
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  FilterMock,
} from '../../../test-setup';
import type { Table } from '@/common/types';
import { N26ImportMock } from '@/fixtures/n26';
import { TableUtils } from '../table-utils';
import { raboImportMock } from '@/fixtures/rabobank';
import { Logger } from '@/common/logger';
import {
  generatePreview,
  importCSV,
} from './rpc';
import { Config } from '../config';
import bankOfAmericaCSV from '@/fixtures/commonwealth-bank.csv?raw';
import Papa from 'papaparse';
import { fakeTestBankImportData } from '@/fixtures/test-bank';
import { getSpreadsheetLocale, removeFilterCriteria } from '../utils/spreadsheet';
import { slugify } from '../helpers';

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  getSourceSheet: vi.fn(() => SheetMock)
}));

vi.mock('../utils/spreadsheet')

const getSpreadsheetLocaleMock = vi.mocked(getSpreadsheetLocale)
const removeFilterCriteriaMock = vi.mocked(removeFilterCriteria)
removeFilterCriteriaMock.mockReturnValue(true)

const configSpy = vi.spyOn(Config, 'getAccountConfiguration');
const importDataSpy = vi.spyOn(TableUtils, 'importData');

const BANK_ID = 'TestBank';

describe('RPC: Import Functions', () => {
  beforeAll(() => {
    configSpy.mockReturnValue(new Config({
      accountId: BANK_ID,
      columnMap: {
        amount: 'TransactionAmount'
      }
    }));
  })

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePreview', () => {
    test('is able to handle table without any useful data and should return the current balance', () => {
      RangeMock.getValues.mockReturnValueOnce([
        ['AnotherBank', 'BANK123456789', '400'],
        [BANK_ID, 'DB123456789', '302.80'],
        ['', '', ''],
      ]);

      const table: Table = [['', '', '', '', '', ''], []];
      const response = generatePreview(
        table,
        slugify(BANK_ID)
      );

      expect(response.success).toBe(true);
      expect(response.data?.result).toStrictEqual(table);
      expect(response.data?.newBalance).toBe(302.8);
    });

    test('is able to calculate new balance when there is useful data in the amounts column', () => {
      RangeMock.getValues.mockReturnValueOnce([
        [BANK_ID, 'DB123456789', '305.85'],
        ['AnotherBank', 'BANK123456789', '400'],
        ['', '', ''],
      ]);

      const response = generatePreview(
        fakeTestBankImportData,
        slugify(BANK_ID)
      );

      expect(response.success).toBe(true);
      expect(response.data?.result).toStrictEqual(fakeTestBankImportData);
      expect(response.data?.newBalance).toBe(358.55);
    });
  });

  describe('importCSV', () => {
    beforeAll(() => {
      Logger.disable()
    })

    test('handles empty import', () => {
      const result = importCSV([], BANK_ID);

      expect(importDataSpy).not.toHaveBeenCalled();
      expect(result.message).toBe('No header row detected in import data!');
      expect(result.success).toBe(false);
    })

    test('handles empty input data', () => {
      const result = importCSV([
        // first row is header row, meaning that there are actually no rows to actually import
        ['header1', 'header2', 'header3', 'header4']
      ], BANK_ID);

      expect(importDataSpy).not.toHaveBeenCalled();
      expect(result.message).toBe('No rows to import, check your import data or configuration!');
      expect(result.success).toBe(false);
    })

    test('removes filters if any are set', () => {
      removeFilterCriteriaMock.mockReturnValue(true)
      SheetMock.getFilter.mockReturnValue(FilterMock)

      importCSV([], 'TestBank')

      expect(SheetMock.getFilter).toHaveBeenCalled();
    });

    test('is able to handle N26 import', () => {
      const fakeN26Config = new Config({
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
      configSpy.mockReturnValueOnce(fakeN26Config)

      const result = importCSV(N26ImportMock, 'N26');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 4 rows!');
      expect(result.success).toBe(true);
    });

    test('is able to handle rabobank import', () => {
      const fakeRabobankConfig = new Config({
        accountId: 'rabobank',
      });
      configSpy.mockReturnValueOnce(fakeRabobankConfig)

      const result = importCSV(raboImportMock, 'rabobank');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 1 rows!');
      expect(result.success).toBe(true);
    });

    test('is able to handle bank of america', () => {
      getSpreadsheetLocaleMock.mockReturnValueOnce('en_US')

      const bankOfAmericaConfig = new Config({
        accountId: 'bank-of-america',
        columnMap: {
          amount: 'Amount',
          date: 'Date',
          description: 'Description'
        }
      })

      configSpy.mockReturnValue(bankOfAmericaConfig)

      const { data } = Papa.parse(bankOfAmericaCSV)
      const result = importCSV(data as Table, 'bank-of-america')

      expect(importDataSpy).toHaveBeenCalled()
      expect(importDataSpy).toHaveBeenCalledWith(expect.arrayContaining([
        expect.arrayContaining([new Date('2023-09-12'),-100,'Utility Bill Payment']),
      ]), undefined);
      expect(result.message).toBe('imported 5 rows!')
      expect(result.success).toBe(true);
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
      ], undefined);
    });
  });
});
