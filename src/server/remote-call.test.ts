import { generatePreview, processCSV } from './remote-calls';
import { StrategyOption, Table } from '../common/types';
import { RangeMock } from '../../test-setup';
import { fakeN26ImportWithBalance, n26ImportMock } from '../fixtures/n26';
import { TableUtils } from './table-utils';
import { raboImportMock } from '../fixtures/rabobank';

const importDataSpy = vi.spyOn(TableUtils, 'importData');

describe('Remote Calls', () => {
  describe('generatePreview', () => {
    test('is able to handle table without any useful data and should return the current balance', () => {
      RangeMock.getValues.mockReturnValueOnce([
        ['n26', 'DB123456789', '302.80'],
        ['Openbank', 'BANK123456789', '400'],
        ['', '', ''],
      ]);

      const table: Table = [['', '', '', '', '', ''], []];
      const { result, newBalance } = generatePreview(table, StrategyOption.N26);

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
        StrategyOption.N26
      );

      expect(result).toStrictEqual(fakeN26ImportWithBalance);
      expect(newBalance).toBe(358.55);
    });
  });

  describe('processCSV', () => {
    beforeEach(() => {
      importDataSpy.mockReset();
    });

    test('is able to handle n26 import', () => {
      const result = processCSV(n26ImportMock, StrategyOption.N26);

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 3 rows!');
    });

    test('is able to handle rabobank import', () => {
      const result = processCSV(raboImportMock, StrategyOption.RABO);

      expect(importDataSpy).toHaveBeenCalled();
      expect(result.message).toBe('imported 1 rows!');
    });
  });
});
