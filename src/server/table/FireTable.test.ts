import { N26ImportMock } from '@/fixtures/n26';
import { AccountUtils } from '../accounts/account-utils';
import { Config } from '../config';
import { FireTable } from './FireTable';
import type { RawTable } from '@/common/types';

describe('FireTable', () => {
  describe('getFireColumnIndex', () => {
    it('should return correct index for known fire columns', () => {
      const table = new FireTable([]);
      expect(table.getFireColumnIndex('ref')).toBe(0);
      expect(table.getFireColumnIndex('iban')).toBe(1);
      expect(table.getFireColumnIndex('date')).toBe(2);
      expect(table.getFireColumnIndex('amount')).toBe(3);
      expect(table.getFireColumnIndex('category')).toBe(9);
    });
  });

  describe('getFireColumn', () => {
    it('should retrieve all values from a fire column', () => {
      // Create a FireTable with data aligned to FIRE_COLUMNS
      // ref, iban, date, amount, balance, contra_account, description, ...
      const table = new FireTable([
        ['ref1', 'NL01', '2024-01-01', 100, '', 'Store A', 'Payment 1', '', '', 'Food', '', '', '', '', '', ''],
        ['ref2', 'NL01', '2024-01-02', 200, '', 'Store B', 'Payment 2', '', '', 'Transport', '', '', '', '', '', ''],
      ]);

      const amounts = table.getFireColumn('amount');
      expect(amounts).toEqual([100, 200]);

      const categories = table.getFireColumn('category');
      expect(categories).toEqual(['Food', 'Transport']);
    });
  });

  describe('sortByDate', () => {
    it('should sort by date column in descending order', () => {
      const table = new FireTable([
        ['', '', '2024-01-01', 100, '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '2024-01-03', 300, '', '', '', '', '', '', '', '', '', '', '', ''],
        ['', '', '2024-01-02', 200, '', '', '', '', '', '', '', '', '', '', '', ''],
      ]);

      table.sortByDate();
      const dates = table.getFireColumn('date');
      expect(dates).toEqual(['2024-01-03', '2024-01-02', '2024-01-01']);
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicates within the specified timespan', () => {
      const table = new FireTable([
        // ref, iban, date, amount, balance, contra_account, ...
        ['1', '', '2023-01-01', '-1.25', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['2', '', '2023-01-01', '23', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['3', '', '2023-01-01', '-30', '', 'Bob', '', '', '', '', '', '', '', '', '', ''],
      ]);

      const duplicates = table.findDuplicates(['contra_account'], 2 * 24 * 60 * 60 * 1000);
      expect(duplicates.getRowCount()).toBe(2);
      expect(duplicates.getData()[0][0]).toBe('1');
      expect(duplicates.getData()[1][0]).toBe('2');
    });

    it('should not find duplicates if timespan is exceeded', () => {
      const table = new FireTable([
        ['1', '', '2023-01-01', '', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['2', '', '2023-01-03', '', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
        ['3', '', '2023-01-01', '', '', 'Bob', '', '', '', '', '', '', '', '', '', ''],
      ]);

      const duplicates = table.findDuplicates(['contra_account'], 1 * 24 * 60 * 60 * 1000);
      expect(duplicates.isEmpty()).toBe(true);
    });

    it('should handle table with less than 2 rows', () => {
      const table = new FireTable([
        ['1', '', '2023-01-01', '', '', 'Alice', '', '', '', '', '', '', '', '', '', ''],
      ]);
      const duplicates = table.findDuplicates(['contra_account'], 1);
      expect(duplicates.isEmpty()).toBe(true);
    });
  });

  describe('categorize', () => {
    it('should return empty category updates when all rows have categories', () => {
      const table = new FireTable([
        // category is at index 9
        ['', '', '', '', '', 'Store', '', '', '', 'Food', '', '', '', '', '', ''],
      ]);

      const { rowsCategorized } = table.categorize();
      expect(rowsCategorized).toBe(0);
    });
  });

  describe('fromCSV', () => {
    it('should return empty result if no rows are provided neither columnMap', () => {
      const result = FireTable.fromCSV({
        headers: [],
        rows: [],
        config: new Config({
          accountId: 'TestBank',
        }),
      });

      expect(result.getRowCount()).toBe(0);
    });

    it('should return correct shape when no column map is provided', () => {
      const rows: RawTable = [
        ['2022-01-01', '100', 'Checking', 'IBAN1234', 'USD'],
        ['2022-01-02', '200', 'Checking', 'IBAN1234', 'USD'],
      ];

      const config = new Config({
        accountId: 'TestBank',
      });

      const result = FireTable.fromCSV({
        headers: ['date', 'amount', 'accountName', 'iban', 'currency'],
        rows,
        config,
      });

      expect(result.getRowCount()).toBe(rows.length);
      expect(result.getColumnCount()).toBeGreaterThan(0);
    });

    it('should map empty strings to null instead of keeping them as empty strings', () => {
      const headers = ['Date', 'Amount', 'Description', 'IBAN'];
      const rows: RawTable = [['2024-01-01', '100', '', 'NL01BANK001']];

      const config = new Config({
        accountId: 'TestBank',
        columnMap: {
          date: 'Date',
          amount: 'Amount',
          description: 'Description',
          iban: 'IBAN',
        },
      });

      const result = FireTable.fromCSV({ headers, rows, config });

      const descriptionIndex = result.getFireColumnIndex('description');
      expect(result.getData()[0][descriptionIndex]).toBe(null);
    });

    it('should correctly import mapped data from input table when column map is provided', () => {
      vi.spyOn(AccountUtils, 'getBankIban').mockReturnValueOnce(
        'NL01BANK0123456789',
      );

      const headers = ['Date', 'Amount', 'Description', 'IBAN'];
      const rows: RawTable = [
        ['2024-01-01', '100,00', 'Test payment 1', 'NL02BANK001'],
        ['2024-01-02', '200,00', 'Test payment 2', 'NL02BANK001'],
      ];

      const config = new Config({
        accountId: 'TestBank',
        columnMap: {
          date: 'Date',
          amount: 'Amount',
          description: 'Description',
          iban: 'IBAN',
        },
      });

      const result = FireTable.fromCSV({ headers, rows, config });
      const data = result.getData();

      expect(result.getRowCount()).toBe(2);
      expect(data[0][result.getFireColumnIndex('date')]).toStrictEqual(
        new Date('2024-01-01'),
      );
      expect(data[0][result.getFireColumnIndex('amount')]).toBe(100);
      expect(data[0][result.getFireColumnIndex('description')]).toBe(
        'Test payment 1',
      );
      expect(data[0][result.getFireColumnIndex('iban')]).toBe(
        'NL01BANK0123456789',
      );

      expect(data[1][result.getFireColumnIndex('date')]).toStrictEqual(
        new Date('2024-01-02'),
      );
      expect(data[1][result.getFireColumnIndex('amount')]).toBe(200);
      expect(data[1][result.getFireColumnIndex('description')]).toBe(
        'Test payment 2',
      );
      expect(data[1][result.getFireColumnIndex('iban')]).toBe(
        'NL01BANK0123456789',
      );
    });

    it('should correctly import when simulating actual bank import', () => {
      vi.spyOn(AccountUtils, 'getBankIban').mockReturnValueOnce(
        'ES12345678910',
      );

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
          currency: 'OriginalCurrency',
        },
        autoFillEnabled: true,
        autoCategorizationEnabled: true,
        autoFillColumnIndices: [1, 5, 9, 13, 14],
        accountId: 'n26',
      });

      const headers = N26ImportMock[0];
      const rows: RawTable = N26ImportMock.slice(1);

      const result = FireTable.fromCSV({
        config: n26Config,
        headers,
        rows,
      });
      const data = result.getData();

      expect(result.getRowCount()).toBe(4);
      expect(data[0][result.getFireColumnIndex('date')]).toStrictEqual(
        new Date('2023-11-26'),
      );
      expect(data[0][result.getFireColumnIndex('amount')]).toBe(-11.63);
      expect(data[0][result.getFireColumnIndex('contra_account')]).toBe(
        'Supermarket X',
      );
      expect(data[0][result.getFireColumnIndex('description')]).toBe(
        'Ticket is attached to the email',
      );
      expect(data[0][result.getFireColumnIndex('iban')]).toBe('ES12345678910');
    });
  });

  describe('clone', () => {
    it('should return a FireTable instance', () => {
      const table = new FireTable([['a']]);
      const cloned = table.clone();
      expect(cloned).toBeInstanceOf(FireTable);
    });

    it('should create an independent copy', () => {
      const table = new FireTable([['a'], ['b']]);
      const cloned = table.clone();
      cloned.deleteLastRow();
      expect(table.getRowCount()).toBe(2);
      expect(cloned.getRowCount()).toBe(1);
    });
  });
});
