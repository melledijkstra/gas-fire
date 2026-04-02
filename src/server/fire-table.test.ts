import { N26ImportMock } from '@/fixtures/n26';
import { AccountUtils } from './accounts/account-utils';
import { Config } from './config';
import { FireTable } from './fire-table';
import type { TableData } from '@/common/types';

describe('FireTable', () => {
  describe('fromInputData', () => {
    it('should return empty result if no rows are provided neither columnMap', () => {
      const table = FireTable.fromInputData(
        [],
        [],
        new Config({
          accountId: 'TestBank',
        })
      );

      expect(table.length).toBe(0);
    });

    it('should return empty result if no column map is provided', () => {
      const rows: TableData = [
        ['2022-01-01', '100', 'Checking', 'IBAN1234', 'USD'],
        ['2022-01-02', '200', 'Checking', 'IBAN1234', 'USD'],
      ];
      // Provide config without column map, which should default to empty mappings
      const config = new Config({
        accountId: 'TestBank',
        // columnMap is undefined by default
      });

      const table = FireTable.fromInputData(
        ['date', 'amount', 'accountName', 'iban', 'currency'],
        rows,
        config,
      );

      expect(table.getData().length).toBe(rows.length);
      expect(table.getData()[0]?.length || 0).toBeGreaterThan(0);
    })

    it('should map empty strings to null instead of keeping them as empty strings', () => {
      const headers = ['Date', 'Amount', 'Description', 'IBAN'];
      const rows: TableData = [
        ['2024-01-01', '100', '', 'NL01BANK001'],
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

      const table = FireTable.fromInputData(
        headers,
        rows,
        config,
      );

      const descriptionIndex = table.getColumnIndex('description');
      expect(table.getData()[0][descriptionIndex]).toBe(null);
    })

    it('should correctly import mapped data from input table when column map is provided', () => {
      // mocking the IBAN of the TestBank, for now we want this value to populate the iban column
      // however in the future we might want to take the column that is configured in the column map instead
      vi.spyOn(AccountUtils, 'getBankIban').mockReturnValueOnce('NL01BANK0123456789');

      const headers = ['Date', 'Amount', 'Description', 'IBAN'];
      const rows: TableData = [
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

      const table = FireTable.fromInputData(
        headers,
        rows,
        config,
      );

      const result = table.getData();

      expect(result.length).toBe(2); // Two rows of data
      expect(result[0][table.getColumnIndex('date')]).toStrictEqual(new Date('2024-01-01'));
      expect(result[0][table.getColumnIndex('amount')]).toBe(100);
      expect(result[0][table.getColumnIndex('description')]).toBe('Test payment 1');
      expect(result[0][table.getColumnIndex('iban')]).toBe('NL01BANK0123456789');

      expect(result[1][table.getColumnIndex('date')]).toStrictEqual(new Date('2024-01-02'));
      expect(result[1][table.getColumnIndex('amount')]).toBe(200);
      expect(result[1][table.getColumnIndex('description')]).toBe('Test payment 2');
      expect(result[1][table.getColumnIndex('iban')]).toBe('NL01BANK0123456789');
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

      const headers = N26ImportMock[0] as string[];
      const rows: TableData = N26ImportMock.slice(1);

      const table = FireTable.fromInputData(
        headers,
        rows,
        n26Config
      );

      const result = table.getData();

      expect(result.length).toBe(4); // Two rows of data
      expect(result[0][table.getColumnIndex('date')]).toStrictEqual(new Date('2023-11-26'));
      expect(result[0][table.getColumnIndex('amount')]).toBe(-11.63);
      expect(result[0][table.getColumnIndex('contra_account')]).toBe('Supermarket X');
      expect(result[0][table.getColumnIndex('description')]).toBe('Ticket is attached to the email');
      expect(result[0][table.getColumnIndex('iban')]).toBe('ES12345678910');
    })
  });
});
