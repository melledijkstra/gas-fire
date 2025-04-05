import {
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  UIMock,
  MailAppMock,
  FilterMock,
} from '../../test-setup';
import type { Table } from '@/common/types';
import { N26ImportMock } from '@/fixtures/n26';
import { TableUtils } from './table-utils';
import { raboImportMock } from '@/fixtures/rabobank';
import { Logger } from '@/common/logger';
import * as categoryDetection from './category-detection';
import * as duplicateFinder from './duplicate-finder';
import {
  generatePreview,
  importCSV,
  getBankAccounts,
  executeAutomaticCategorization,
  executeFindDuplicates,
  mailNetWorth,
} from './remote-calls';
import { Config } from './config';
import bankOfAmericaCSV from '@/fixtures/bank-of-america.csv?raw';
import Papa from 'papaparse';
import { fakeTestBankImportData } from '@/fixtures/test-bank';
import { getSpreadsheetLocale, removeFilterCriteria } from './utils/spreadsheet';
import { slugify } from './helpers';

vi.mock('./globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  getSourceSheet: vi.fn(() => SheetMock)
}));

vi.mock('./helpers', async (actualImport) => ({
  ...await actualImport<typeof import('./helpers')>(),
  getCategoryNames: vi.fn(() => ['cat1', 'cat2']),
  getColumnIndexByName: vi.fn(name => {
    if (name === 'category') return 0;
    if (name === 'contra_account') return 1;
    return -1;
  }),
}))

vi.mock('./utils/spreadsheet')

const getSpreadsheetLocaleMock = vi.mocked(getSpreadsheetLocale)
const removeFilterCriteriaMock = vi.mocked(removeFilterCriteria)
removeFilterCriteriaMock.mockReturnValue(true)

const configSpy = vi.spyOn(Config, 'getAccountConfiguration');
const detectCategorySpy = vi.spyOn(
  categoryDetection,
  'detectCategoryByTextAnalysis'
);
const findDuplicatesSpy = vi.spyOn(duplicateFinder, 'findDuplicates');
const importDataSpy = vi.spyOn(TableUtils, 'importData');

const BANK_ID = 'TestBank';

describe('Remote Calls', () => {
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
      const { result, newBalance } = generatePreview(
        table,
        slugify(BANK_ID)
      );

      expect(result).toStrictEqual(table);
      expect(newBalance).toBe(302.8);
    });

    test('is able to calculate new balance when there is useful data in the amounts column', () => {
      RangeMock.getValues.mockReturnValueOnce([
        [BANK_ID, 'DB123456789', '305.85'],
        ['AnotherBank', 'BANK123456789', '400'],
        ['', '', ''],
      ]);

      const { result, newBalance } = generatePreview(
        fakeTestBankImportData,
        slugify(BANK_ID)
      );

      expect(result).toStrictEqual(fakeTestBankImportData);
      expect(newBalance).toBe(358.55);
    });
  });

  describe('importCSV', () => {
    beforeAll(() => {
      Logger.disable()
    })

    test('handles empty import', () => {
      const result = importCSV([], BANK_ID);

      expect(importDataSpy).not.toHaveBeenCalled();
      expect(result.message).toBe('No rows to import, check your import data or rules!');
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
    });

    test('is able to handle rabobank import', () => {
      const fakeRabobankConfig = new Config({
        accountId: 'rabobank',
      });
      configSpy.mockReturnValueOnce(fakeRabobankConfig)

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

      configSpy.mockReturnValue(bankOfAmericaConfig)

      const { data } = Papa.parse(bankOfAmericaCSV)
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

  describe('getBankAccounts', () => {
    test('in case there are no accounts, it should return an empty object', () => {
      RangeMock.getValues.mockReturnValue([[], []]);
      const result = getBankAccounts();
      expect(result).toEqual({});
    });

    test('should return a list of bank accounts', () => {
      RangeMock.getValues
        .mockReturnValueOnce([['n26'], ['Openbank']])
        .mockReturnValueOnce([['DB123456789'], ['BANK123456789']]);
      const result = getBankAccounts();
      expect(result).toEqual({
        n26: 'DB123456789',
        Openbank: 'BANK123456789',
      });
    });
  });

  describe.skip('executeAutomaticCategorization', () => {
    test('should do nothing if user cancels', () => {
      UIMock.alert.mockReturnValueOnce(UIMock.Button.NO);
      executeAutomaticCategorization();
      expect(UIMock.alert).toHaveBeenCalled();
      expect(detectCategorySpy).not.toHaveBeenCalled();
    });

    test('should show an alert if no rows were categorized', () => {
      UIMock.alert.mockReturnValueOnce(UIMock.Button.YES);
      RangeMock.getValues.mockReturnValue([
        ['category', 'contra_account'],
        ['cat1', 'account1'],
      ]);
      executeAutomaticCategorization();
      expect(UIMock.alert).toHaveBeenCalledWith('No rows were categorized!');
    });

    test('should categorize rows', () => {
      UIMock.alert.mockReturnValueOnce(UIMock.Button.YES);
      RangeMock.getValues.mockReturnValue([
        ['category', 'contra_account'],
        ['', 'account1'],
        ['', 'account2'],
      ]);
      detectCategorySpy.mockReturnValue('cat2');
      executeAutomaticCategorization();
      expect(detectCategorySpy).toHaveBeenCalledTimes(2);
      expect(UIMock.alert).toHaveBeenCalledWith('Succesfully categorized 2 rows!');
    });
  });

  describe('executeFindDuplicates', () => {
    test('should do nothing if user cancels', () => {
      UIMock.prompt.mockReturnValueOnce({ getSelectedButton: () => UIMock.Button.CANCEL });
      executeFindDuplicates();
      expect(findDuplicatesSpy).not.toHaveBeenCalled();
    });

    test('should show an alert if input is invalid', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => 'invalid',
      });
      executeFindDuplicates();
      expect(UIMock.alert).toHaveBeenCalledWith(
        'Invalid input! Please enter a valid number of days (e.g. 7)'
      );
    });

    test('should show an alert if no duplicates are found', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => '7',
      });
      findDuplicatesSpy.mockReturnValue([]);
      executeFindDuplicates();
      expect(UIMock.alert).toHaveBeenCalledWith('No duplicates found!');
    });

    test('should copy duplicates to a new sheet', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => '7',
      });
      findDuplicatesSpy.mockReturnValue([
        ['row1'],
        ['row2'],
      ]);
      executeFindDuplicates();
      expect(SheetMock.clear).toHaveBeenCalled();
      expect(SheetMock.getRange).toHaveBeenCalledTimes(3);
      expect(UIMock.alert).toHaveBeenCalledWith(
        'Found 1 duplicates! Rows have been copied to the "duplicate-rows" sheet'
      );
    });
  });

  describe('mailNetWorth', () => {
    test('should send an email with the net worth', () => {
      RangeMock.getValue.mockReturnValueOnce(12345.67);
      SpreadsheetMock.getOwner.mockReturnValue({ getEmail: vi.fn(() => 'test@example.com') });
      SpreadsheetMock.getRangeByName.mockReturnValue(RangeMock);

      mailNetWorth();
      expect(MailAppMock.sendEmail).toHaveBeenCalled();
    });
  });
});
