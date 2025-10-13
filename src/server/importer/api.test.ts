import {
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  FilterMock,
} from '../../../test-setup';
import type { Table } from '@/common/types';
import { fakeN26ImportWithBalance, n26ImportMock } from '@/fixtures/n26';
import { TableUtils } from '../table-utils';
import { raboImportMock } from '@/fixtures/rabobank';
import { Logger } from '@/common/logger';
import { generatePreview, processCSV } from './api';

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  sourceSheet: SheetMock,
}));

vi.mock('../helpers', () => ({
  removeFilterCriteria: vi.fn(() => true),
}));

const importDataSpy = vi.spyOn(TableUtils, 'importData');

Logger.disable();

describe('Importer API', () => {
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
});
