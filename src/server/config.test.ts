import { Config } from './config';

describe('Configuration Tests', () => {
  describe('rabobank amount issue', () => {
    const config = new Config('rabobank', {
      amount: 'Saldo',
    });

    test('is able to retrieve balance column correctly', () => {
      const table = [
        ['ref', 'IBAN', 'Saldo'],
        ['1234', 'NL123', '20,20'],
      ];
      const amountCol = config.getColumnIndex('amount', table);

      expect(amountCol).toBe(2);

      if (amountCol) {
        expect(table[1][amountCol]).toBe('20,20');
      }
      
    });
  });
});
