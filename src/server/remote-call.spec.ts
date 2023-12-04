import { describe, expect, test } from 'vitest';
import { generatePreview } from './remote-calls';
import { StrategyOption, Table } from '../common/types';
import { RangeMock } from '../../test-setup';

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

      const table: Table = [
        ['', '', '', '', '', '20'],
        ['', '', '', '', '', '-25.6', '', ''],
        ['', '', '', '', '', '+58.30'],
        [],
      ];
      const { result, newBalance } = generatePreview(table, StrategyOption.N26);

      expect(result).toStrictEqual(table);
      expect(newBalance).toBe(358.55);
    });
  });
});
