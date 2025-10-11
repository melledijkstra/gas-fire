import { TableUtils } from './table-utils';
import type { Table } from '@/common/types';

describe('TableUtils', () => {
  describe('transpose', () => {
    it('should transpose a table correctly', () => {
      const input: Table = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ];
      const expected: Table = [
        ['a', 'd'],
        ['b', 'e'],
        ['c', 'f'],
      ];
      expect(TableUtils.transpose(input)).toEqual(expected);
    });

    it('should handle empty table', () => {
      expect(TableUtils.transpose([])).toEqual([]);
    });

    it('should handle jagged arrays by padding with undefined', () => {
      const input = [
        ['a', 'b', 'c'],
        ['d', 'e'],
        ['f', 'g', 'h', 'i'],
      ];
      const expected = [
        ['a', 'd', 'f'],
        ['b', 'e', 'g'],
        ['c', undefined, 'h'],
        [undefined, undefined, 'i'],
      ];
      expect(TableUtils.transpose(input)).toEqual(expected);
    });
  });

  describe('sortByDate', () => {
    const sampleData: Table = [
      ['Transaction 1', '2024-03-15', '100'],
      ['Transaction 2', '2024-03-14', '200'],
      ['Transaction 3', '2024-03-15 14:30:00', '300'],
      ['Transaction 4', '2024-03-15 09:00:00', '400'],
    ];

    it('should sort dates in descending order', () => {
      const dateColumnIndex = 1;
      const sortFn = TableUtils.sortByDate(dateColumnIndex);
      const result = sortFn([...sampleData]);

      expect(result[0][1]).toBe('2024-03-15 14:30:00');
      expect(result[1][1]).toBe('2024-03-15 09:00:00');
      expect(result[2][1]).toBe('2024-03-15');
      expect(result[3][1]).toBe('2024-03-14');
    });

    it('should handle time differences within the same day', () => {
      const data: Table = [
        ['Payment 1', '2024-03-15 08:00:00', '100'],
        ['Payment 2', '2024-03-15 09:30:00', '200'],
        ['Payment 3', '2024-03-15 09:00:00', '300'],
      ];

      const dateColumnIndex = 1;
      const sortFn = TableUtils.sortByDate(dateColumnIndex);
      const result = sortFn([...data]);

      expect(result[0][1]).toBe('2024-03-15 09:30:00');
      expect(result[1][1]).toBe('2024-03-15 09:00:00');
      expect(result[2][1]).toBe('2024-03-15 08:00:00');
    });
  });

  describe('deleteColumns', () => {
    it('should delete specified columns', () => {
      const input: Table = [
        ['a', 'b', 'c', 'd'],
        ['e', 'f', 'g', 'h'],
      ];
      const expected: Table = [
        ['a', 'd'],
        ['e', 'h'],
      ];
      expect(TableUtils.deleteColumns(input, [1, 2])).toEqual(expected);
    });

    it('should handle non-existent column indices', () => {
      const input: Table = [
        ['a', 'b'],
        ['c', 'd'],
      ];
      expect(TableUtils.deleteColumns(input, [5])).toEqual(input);
    });
  });

  describe('ensureLength', () => {
    it('should pad array with nulls if shorter than target length', () => {
      const input = [1, 2, 3];
      const expected = [1, 2, 3, null, null];
      expect(TableUtils.ensureLength(input, 5)).toEqual(expected);
    });

    it('should truncate array if longer than target length', () => {
      const input = [1, 2, 3, 4, 5];
      const expected = [1, 2, 3];
      expect(TableUtils.ensureLength(input, 3)).toEqual(expected);
    });

    it('should return same array if length matches target', () => {
      const input = [1, 2, 3];
      expect(TableUtils.ensureLength(input, 3)).toEqual(input);
    });
  });

  describe('retrieveColumn', () => {
    it('should retrieve specified column', () => {
      const input: Table = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ];
      expect(TableUtils.retrieveColumn(input, 1)).toEqual(['b', 'e']);
    });

    it('should handle missing values', () => {
      const input: Table = [
        ['a', '', 'c'],
        ['d', '', 'f'],
      ];
      expect(TableUtils.retrieveColumn(input, 1)).toEqual(['', '']);
    });
  });
});
