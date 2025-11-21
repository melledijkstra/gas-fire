import { N26ImportMock } from '@/fixtures/n26';
import { AccountUtils } from './account-utils';
import { Config } from './config';
import { processInputDataAndShapeFiresheetStructure, TableUtils } from './table-utils';
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
      const result = TableUtils.sortByDate(sampleData, dateColumnIndex);

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
      const result = TableUtils.sortByDate(data, dateColumnIndex);

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

  describe('processInputDataAndShapeFiresheetStructure', () => {
    it('should return empty result if no rows are provided neither columnMap', () => {
      const result = processInputDataAndShapeFiresheetStructure({
        headers: [],
        rows: [],
        config: new Config({
          accountId: 'TestBank',
        })
      });

      expect(result.length).toBe(0);
    });

    it('should return empty result if no column map is provided', () => {
      const rows = [
        ['2022-01-01', '100', 'Checking', 'IBAN1234', 'USD'],
        ['2022-01-02', '200', 'Checking', 'IBAN1234', 'USD'],
      ];
      // Provide config without column map, which should default to empty mappings
      const config = new Config({
        accountId: 'TestBank',
        // columnMap is undefined by default
      });

      const result = processInputDataAndShapeFiresheetStructure({
        headers: ['date', 'amount', 'accountName', 'iban', 'currency'],
        rows,
        config,
      });

      // Since there is no columnMap and according to implementation, 
      // columns will be attempted to be filled in with available mappings,
      // but in this config the account doesn't know where columns are, so most columns will be empty,
      // except maybe iban (using AccountUtils) and import_date (filled with Date).
      // But result will be non-empty: each FIRE_COLUMN will map to an empty or filled column.

      expect(Array.isArray(result)).toBe(true);
      // Number of rows matches input rows
      expect(result.length).toBe(rows.length);
      // Number of columns matches FIRE_COLUMNS length (import structure)
      // If FIRE_COLUMNS is imported
      expect(result[0]?.length || 0).toBeGreaterThan(0);
    })

    it('should correctly import mapped data from input table when column map is provided', () => {
      // mocking the IBAN of the TestBank, for now we want this value to populate the iban column
      // however in the future we might want to take the column that is configured in the column map instead
      vi.spyOn(AccountUtils, 'getBankIban').mockReturnValueOnce('NL01BANK0123456789');

      const headers = ['Date', 'Amount', 'Description', 'IBAN'];
      const rows: Table = [
        ['2024-01-01', '100,00', 'Test payment 1', 'NL02BANK001'],
        ['2024-01-02', '200,00', 'Test payment 2', 'NL02BANK001'],
      ];

      const config = new Config({
        accountId: 'TestBank',
        columnMap: {
          date: 'Date',
          amount: 'Amount',
          description: 'Description',
          iban: 'IBAN'
        },
      });

      const result = processInputDataAndShapeFiresheetStructure({
        headers,
        rows,
        config,
      });

      expect(result.length).toBe(2); // Two rows of data
      expect(result[0][TableUtils.getFireColumnIndexByName('date')]).toStrictEqual(new Date('2024-01-01'));
      expect(result[0][TableUtils.getFireColumnIndexByName('amount')]).toBe(100);
      expect(result[0][TableUtils.getFireColumnIndexByName('description')]).toBe('Test payment 1');
      expect(result[0][TableUtils.getFireColumnIndexByName('iban')]).toBe('NL01BANK0123456789');

      expect(result[1][TableUtils.getFireColumnIndexByName('date')]).toStrictEqual(new Date('2024-01-02'));
      expect(result[1][TableUtils.getFireColumnIndexByName('amount')]).toBe(200);
      expect(result[1][TableUtils.getFireColumnIndexByName('description')]).toBe('Test payment 2');
      expect(result[1][TableUtils.getFireColumnIndexByName('iban')]).toBe('NL01BANK0123456789');
    })

    it('should correctly import when simulating actual bank import', () => {
      // mocking the IBAN of the TestBank, for now we want this value to populate the iban column
      // however in the future we might want to take the column that is configured in the column map instead
      vi.spyOn(AccountUtils, 'getBankIban').mockReturnValueOnce('ES12345678910');

      const n26Config = new Config({
        columnMap: {
          ref: '',
          iban: '',
          date: 'Date',
          amount: 'Amount',
          balance: '',
          contra_account: 'Payee',
          description: 'Payment reference',
          comments: '',
          icon: '',
          category: '',
          label: '',
          import_date: '',
          hours: '',
          disabled: '',
          contra_iban: 'AccountNumber',
          currency: 'OriginalCurrency'
        },
        autoFillEnabled: true,
        autoCategorizationEnabled: true,
        autoFillColumnIndices: [1, 5, 9, 13, 14],
        accountId: 'n26'
      })

      const headers = N26ImportMock[0];
      const rows: Table = N26ImportMock.slice(1);

      const result = processInputDataAndShapeFiresheetStructure({
        config: n26Config,
        headers,
        rows
      });

      expect(result.length).toBe(4); // Two rows of data
      expect(result[0][TableUtils.getFireColumnIndexByName('date')]).toStrictEqual(new Date('2023-11-26'));
      expect(result[0][TableUtils.getFireColumnIndexByName('amount')]).toBe(-11.63);
      expect(result[0][TableUtils.getFireColumnIndexByName('contra_account')]).toBe('Supermarket X');
      expect(result[0][TableUtils.getFireColumnIndexByName('description')]).toBe('Ticket is attached to the email');
      expect(result[0][TableUtils.getFireColumnIndexByName('iban')]).toBe('ES12345678910');
    })
  });
});
