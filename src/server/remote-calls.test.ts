import {
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  UIMock,
  MailAppMock,
  FilterMock,
} from '../../test-setup';
import type { Table } from '@/common/types';
import { fakeN26ImportWithBalance, n26ImportMock } from '@/fixtures/n26';
import { TableUtils } from './table-utils';
import { raboImportMock } from '@/fixtures/rabobank';
import { Logger } from '@/common/logger';
import * as categoryDetection from './category-detection';
import * as duplicateFinder from './duplicate-finder';
import {
  generatePreview,
  processCSV,
  getBankAccounts,
  executeAutomaticCategorization,
  getStrategyOptions,
  executeFindDuplicates,
  mailNetWorth,
} from './remote-calls';

vi.mock('./globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  sourceSheet: SheetMock,
}));

vi.mock('./helpers', () => ({
  getCategoryNames: vi.fn(() => ['cat1', 'cat2']),
  getColumnIndexByName: vi.fn(name => {
    if (name === 'category') return 0;
    if (name === 'contra_account') return 1;
    return -1;
  }),
  removeFilterCriteria: vi.fn(() => true),
}));

const detectCategorySpy = vi.spyOn(
  categoryDetection,
  'detectCategoryByTextAnalysis'
);
const findDuplicatesSpy = vi.spyOn(duplicateFinder, 'findDuplicates');
const importDataSpy = vi.spyOn(TableUtils, 'importData');

Logger.disable();

describe('Remote Calls', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('generatePreview', () => {
    test('is able to handle table without any useful data and should return the current balance', () => {
      RangeMock.getValues.mockReturnValueOnce([
        ['n26', 'DB123456789', '302.80'],
        ['Openbank', 'BANK123456789', '400'],
        ['', '', ''],
      ]);

      const table: Table = [['', '', '', '', '', ''], []];
      const { result, newBalance } = generatePreview(table, 'n26');

      expect(result).toStrictEqual(table);
      expect(newBalance).toBe(302.8);
    });

    test('is able to calculate new balance when there is useful data in the amounts column', () => {
      RangeMock.getValues.mockReturnValueOnce([
        ['n26', 'DB123456789', '305.85'],
        ['Openbank', 'BANK123456789', '400'],
        ['', '', ''],
      ]);

      const { result, newBalance } = generatePreview(
        fakeN26ImportWithBalance,
        'n26'
      );

      expect(result).toStrictEqual(fakeN26ImportWithBalance);
      expect(newBalance).toBe(358.55);
    });
  });

  describe('processCSV', () => {
    test('is able to handle n26 import', () => {
      FilterMock.remove.mockReturnValue(true);
      const result = processCSV(n26ImportMock, 'n26');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 3 rows!');
    });

    test('is able to handle rabobank import', () => {
      FilterMock.remove.mockReturnValue(true);
      const result = processCSV(raboImportMock, 'rabobank');

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 1 rows!');
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

  describe('getStrategyOptions', () => {
    test('should return a list of strategy options', () => {
      RangeMock.getValues.mockReturnValue([
        ['n26'],
        ['Openbank'],
        ['Trading 212'],
      ]);
      const result = getStrategyOptions();
      expect(result).toEqual({
        n26: 'n26',
        openbank: 'Openbank',
        trading_212: 'Trading 212',
      });
    });
  });

  describe('executeAutomaticCategorization', () => {
    beforeEach(() => {
      SheetMock.getFilter.mockReturnValue(FilterMock);
    });

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
