import { Transformers } from './transformers';
import { getSpreadsheetLocale } from './utils/spreadsheet';

vi.mock('./utils/spreadsheet', () => ({
  getSpreadsheetLocale: vi.fn(),
}));

const getSpreadsheetLocaleMock = vi.mocked(getSpreadsheetLocale);

describe('Transformers', () => {
  test('Transformers.transformMoney', () => {
    expect(Transformers.transformMoney('23.5')).toBe(23.5);
    expect(Transformers.transformMoney('23.50000000')).toBe(23.5);
    expect(Transformers.transformMoney('23.123456789')).toBe(23.123456789);
    expect(Transformers.transformMoney('23,1234')).toBe(23.1234);
    expect(Transformers.transformMoney('1.233.223,1234')).toBe(1233223.1234);
    expect(Transformers.transformMoney('-1,233,223.1234')).toBe(-1233223.1234);
    expect(Transformers.transformMoney('+1 233 223.1234')).toBe(1233223.1234);
    expect(Transformers.transformMoney('1.233.223,1234')).toBe(1233223.1234);
    expect(Transformers.transformMoney('5023.1234')).toBe(5023.1234);
    expect(Transformers.transformMoney('1,234.56')).toBe(1234.56);
    expect(Transformers.transformMoney('+1,234.56')).toBe(1234.56);
    expect(Transformers.transformMoney('-1,234.56')).toBe(-1234.56);
    expect(Transformers.transformMoney('$-1,234.56')).toBe(-1234.56);
    expect(Transformers.transformMoney('€ -1 234.56')).toBe(-1234.56);
    expect(Transformers.transformMoney('€ -1 234,56')).toBe(-1234.56);
    expect(Transformers.transformMoney('! -200,00,234.56')).toBe(-20000234.56);
    expect(Transformers.transformMoney('$-1,234.56')).toBe(-1234.56);
    expect(Transformers.transformMoney('$##@%$$#-1,234.56')).toBe(-1234.56);
  });

  test('Transformers.transformDate', () => {
    expect(Transformers.transformDate('2023-10-01')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('01/10/2023')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('01.10.2023')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('2023.10.01')).toEqual(new Date('2023-10-01'));
    
    // US only logic
    getSpreadsheetLocaleMock.mockReturnValue('en-US');
    expect(Transformers.transformDate('10.01.2023')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('10/01/2023')).toEqual(new Date('2023-10-01'));
    getSpreadsheetLocaleMock.mockReset();
  });
});
