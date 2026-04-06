import {
  SheetMock,
  SpreadsheetMock,
  FilterMock,
} from '../../../test-setup';
import type { RawTable } from '@/common/types';
import { N26ImportMock } from '@/fixtures/n26';
import { FireSheet, FireTable } from '../table';
import { AccountUtils } from '../accounts/account-utils';
import { raboImportMock } from '@/fixtures/rabobank';
import { Logger } from '@/common/logger';
import {
  previewPipeline,
  importPipeline,
} from './rpc';
import { Config } from '../config';
import bankOfAmericaCSV from '@/fixtures/commonwealth-bank.csv?raw';
import Papa from 'papaparse';
import { fakeTestBankImportData } from '@/fixtures/test-bank';
import { getSpreadsheetLocale, removeFilterCriteria } from '../utils/spreadsheet';
import { slugify } from '@/common/helpers';

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  getSourceSheet: vi.fn(() => SheetMock)
}));

vi.mock('../utils/spreadsheet')

vi.mock('../accounts/rpc', () => ({
  getBankAccountOptionsCached: vi.fn(() => ({
    success: true,
    data: {
      [slugify(BANK_ID)]: 'DB123456789',
      'anotherbank': 'BANK123456789'
    }
  }))
}));

const getSpreadsheetLocaleMock = vi.mocked(getSpreadsheetLocale)
const removeFilterCriteriaMock = vi.mocked(removeFilterCriteria)
removeFilterCriteriaMock.mockReturnValue(true)

const configSpy = vi.spyOn(Config, 'getAccountConfiguration');
const importDataSpy = vi.spyOn(FireSheet.prototype, 'importData');

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

  describe('previewPipeline', () => {
    let getBalanceSpy: ReturnType<typeof vi.spyOn>;
    let fireSheetSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      getBalanceSpy = vi.spyOn(AccountUtils, 'getBalance').mockReturnValue(302.8);
      fireSheetSpy = vi.spyOn(FireSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new FireTable([]));
    });

    afterEach(() => {
      getBalanceSpy.mockRestore();
      fireSheetSpy.mockRestore();
    });

    test('is able to handle table without any useful data and should return the current balance', () => {
      const table: RawTable = [['TransactionAmount', 'TransactionDate', 'Payee'], ['', '', '']];
      const response = previewPipeline(
        table,
        BANK_ID
      );

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data?.newBalance).toBeCloseTo(302.8, 2);
        expect(response.data?.summary.validCount).toBe(0);
      }
    });

    test('is able to calculate new balance when there is useful data in the amounts column', () => {
      getBalanceSpy.mockReturnValue(305.85);

      const response = previewPipeline(
        structuredClone(fakeTestBankImportData),
        BANK_ID
      );

      expect(response.success).toBe(true);
      if (response.success) {
        expect(response.data?.newBalance).toBeCloseTo(358.55, 2);
        expect(response.data?.summary.validCount).toBe(3);
      }
    });
  });

  describe('importPipeline', () => {
    beforeAll(() => {
      Logger.disable()
    })

    let fireSheetSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      fireSheetSpy = vi.spyOn(FireSheet.prototype, 'getLastImportedTransactions').mockReturnValue(new FireTable([]));
    });

    afterEach(() => {
      fireSheetSpy.mockRestore();
    });

    test('handles empty import', () => {
      const result = importPipeline([], BANK_ID);

      expect(importDataSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No header row detected in import data!');
      }
    })

    test('handles empty input data', () => {
      const result = importPipeline([
        // first row is header row, meaning that there are actually no rows to actually import
        ['header1', 'header2', 'header3', 'header4']
      ], BANK_ID);

      expect(importDataSpy).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('No rows to import, check your import data or configuration!');
      }
    })

    test('removes filters if any are set', () => {
      removeFilterCriteriaMock.mockReturnValue(true)
      SheetMock.getFilter.mockReturnValue(FilterMock)

      importPipeline([], 'TestBank')

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

      const result = importPipeline(N26ImportMock, 'N26');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toBe('imported 4 rows!');
      }
    });

    test('is able to handle rabobank import', () => {
      const fakeRabobankConfig = new Config({
        accountId: 'rabobank',
      });
      configSpy.mockReturnValueOnce(fakeRabobankConfig)

      const result = importPipeline(raboImportMock, 'rabobank');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toBe('imported 1 rows!');
      }
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
      const result = importPipeline(data as RawTable, 'bank-of-america')

      expect(importDataSpy).toHaveBeenCalled()
      const [fireTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
      expect(fireTable.getData()).toEqual(expect.arrayContaining([
        expect.arrayContaining([new Date('2023-09-12'),-100,'Utility Bill Payment']),
      ]))
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toBe('imported 5 rows!')
      }
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

      importPipeline(fakeTestBankImportData, BANK_ID);

      expect(importDataSpy).toHaveBeenCalled();
      const [fireTable] = importDataSpy.mock.calls[importDataSpy.mock.calls.length - 1]
      expect(fireTable.getData()).toEqual([
        expect.arrayContaining([new Date('2016-01-23'), -25.6]),
        expect.arrayContaining([new Date('2015-05-21'), 58.3]),
        expect.arrayContaining([new Date('2015-05-20'), 20]),
      ]);
    });
  });
});
