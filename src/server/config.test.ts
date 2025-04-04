import { SheetMock } from '../../test-setup';
import { Config } from './config';

describe('Configuration Tests', () => {
  test('can read configurations', () => {
    // the first range of values is for retrieving the column mapping
    SheetMock.getSheetValues.mockReturnValueOnce([
      ['Column Mapping','Bank of America','Commerzbank','ING','Revolut'],
      ['ref','','','',''],
      ['iban','','','',''],
      ['date','Date','','',''],
      ['amount','Amount','','',''],
      ['balance','','','',''],
      ['contra_account','','','',''],
      ['description','Description','','',''],
      ['comments','','','',''],
      ['icon','','','',''],
      ['category','','','',''],
      ['label','','','',''],
      ['import_date','','','',''],
      ['hours','','','',''],
      ['disabled','','','',''],
      ['contra_iban','','','',''],
      ['currency','','','',''],
      ['','','','',''],
      ['','','','',''],
    ]);
    
    // next time the getSheetValues is called, we return general config data
    SheetMock.getSheetValues.mockReturnValueOnce([
      // bank identifiers
      [ 'Bank of America', 'Commerzbank', 'ING', 'Revolut', '', '', '', '', '' ],
      // auto fill columns
      [ '1,5,9,13,14', '1,5,9,13,14', '1,5,9,13,14', '1,5,9,13,14', '', '', '', '', '' ],
      // should autofill after import?
      [ true, true, true, true, true, true, true, true, true ],
      // auto categorize transactions
      [ true, true, true, true, true, true, true, true, true ],
    ]);

    const configs = Config.getConfigurations()

    expect(configs).toBeDefined()
    const configKeys = Object.keys(configs)
    expect(configKeys).toHaveLength(4)
    const firstConfig = configs[configKeys[0]]
    expect(firstConfig).toBeDefined()
    expect(firstConfig.getAccountId()).toBe('bank-of-america')
    expect(firstConfig.autoFillEnabled).toBe(true)
    expect(firstConfig.autoCategorizationEnabled).toBe(true)
    expect(firstConfig.autoFillColumnIndices).toEqual([1, 5, 9, 13, 14])
    expect(firstConfig.getImportColumnNameByFireColumn('date')).toBe('Date')
  })

  describe('rabobank amount issue', () => {
    const config = new Config({
      accountId: 'rabobank',
      columnMap: {
        amount: 'Saldo',
      }
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
