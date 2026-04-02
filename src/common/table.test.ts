import { Table } from './table';
import type { TableData } from './types';

describe('Table', () => {
  describe('transpose', () => {
    it('should transpose a table correctly', () => {
      const input: TableData = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ];
      const table = new Table(input);
      table.transpose();
      const expected: TableData = [
        ['a', 'd'],
        ['b', 'e'],
        ['c', 'f'],
      ];
      expect(table.getData()).toEqual(expected);
    });

    it('should handle empty table', () => {
      const table = new Table([]);
      table.transpose();
      expect(table.getData()).toEqual([]);
    });
  });

  describe('sortByDate', () => {
    const sampleData: TableData = [
      ['Transaction 1', '2024-03-15', '100'],
      ['Transaction 2', '2024-03-14', '200'],
      ['Transaction 3', '2024-03-15 14:30:00', '300'],
      ['Transaction 4', '2024-03-15 09:00:00', '400'],
    ];

    it('should sort dates in descending order', () => {
      const table = new Table(sampleData);
      const dateColumnIndex = 1;
      table.sortByDate(dateColumnIndex);
      const result = table.getData();

      expect(result[0][1]).toBe('2024-03-15 14:30:00');
      expect(result[1][1]).toBe('2024-03-15 09:00:00');
      expect(result[2][1]).toBe('2024-03-15');
      expect(result[3][1]).toBe('2024-03-14');
    });

    it('should handle time differences within the same day', () => {
      const data: TableData = [
        ['Payment 1', '2024-03-15 08:00:00', '100'],
        ['Payment 2', '2024-03-15 09:30:00', '200'],
        ['Payment 3', '2024-03-15 09:00:00', '300'],
      ];

      const table = new Table(data);
      const dateColumnIndex = 1;
      table.sortByDate(dateColumnIndex);
      const result = table.getData();

      expect(result[0][1]).toBe('2024-03-15 09:30:00');
      expect(result[1][1]).toBe('2024-03-15 09:00:00');
      expect(result[2][1]).toBe('2024-03-15 08:00:00');
    });
  });

  describe('deleteColumns', () => {
    it('should delete specified columns', () => {
      const input: TableData = [
        ['a', 'b', 'c', 'd'],
        ['e', 'f', 'g', 'h'],
      ];
      const table = new Table(input);
      table.deleteColumns([1, 2]);
      const expected: TableData = [
        ['a', 'd'],
        ['e', 'h'],
      ];
      expect(table.getData()).toEqual(expected);
    });

    it('should handle non-existent column indices', () => {
      const input: TableData = [
        ['a', 'b'],
        ['c', 'd'],
      ];
      const table = new Table(input);
      table.deleteColumns([5]);
      expect(table.getData()).toEqual(input);
    });
  });

  describe('ensureLength', () => {
    it('should pad array with nulls if shorter than target length', () => {
      const table = new Table([[1, 2, 3]]);
      table.ensureLength(5);
      const expected = [[1, 2, 3, null, null]];
      expect(table.getData()).toEqual(expected);
    });

    it('should truncate array if longer than target length', () => {
      const table = new Table([[1, 2, 3, 4, 5]]);
      table.ensureLength(3);
      const expected = [[1, 2, 3]];
      expect(table.getData()).toEqual(expected);
    });

    it('should return same array if length matches target', () => {
      const input = [[1, 2, 3]];
      const table = new Table(input);
      table.ensureLength(3);
      expect(table.getData()).toEqual(input);
    });
  });

  describe('retrieveColumn', () => {
    it('should retrieve specified column', () => {
      const input: TableData = [
        ['a', 'b', 'c'],
        ['d', 'e', 'f'],
      ];
      const table = new Table(input);
      expect(table.retrieveColumn(1)).toEqual(['b', 'e']);
    });

    it('should handle missing values', () => {
      const input: TableData = [
        ['a', '', 'c'],
        ['d', '', 'f'],
      ];
      const table = new Table(input);
      expect(table.retrieveColumn(1)).toEqual(['', '']);
    });
  });
});
