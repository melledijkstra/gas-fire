import { categorizeTransactions } from './index';


describe('categorizeTransactions', () => {
  test('should categorize transactions correctly', () => {
    const data = [
      ['ref', 'iban', 'date', 'description', 'amount', 'contra_account', '', '', '', 'category'],
      ['1', 'NL91ABNA0417164300', '2023-01-01', 'Grocery Store', '-50', 'supermercado', '', '', '', ''],
      ['2', 'NL91ABNA0417164300', '2023-01-02', 'Salary Payment', '2000', 'adidas espana s.a.', '', '', '', ''],
      ['3', 'NL91ABNA0417164300', '2023-01-03', 'Restaurant Bill', '-30', 'restaurant', '', '', '', ''],
    ];

    const { categoryUpdates, rowsCategorized } = categorizeTransactions(data);

    expect(categoryUpdates).toEqual([
      ['Food & Groceries'],
      ['Salary'],
      ['Bars, Restaurants & Clubs'],
    ]);

    expect(rowsCategorized).toBe(3);
  });
});