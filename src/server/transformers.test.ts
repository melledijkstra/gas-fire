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

    // Test Swiss and Indian formats
    expect(Transformers.transformMoney("1'234'567.89")).toBe(1234567.89);
    expect(Transformers.transformMoney("1'234'567,89")).toBe(1234567.89);
    expect(Transformers.transformMoney('1,23,456.78')).toBe(123456.78);
    expect(Transformers.transformMoney('1 234 567.89')).toBe(1234567.89);
    expect(Transformers.transformMoney('1.234,56')).toBe(1234.56);

    // Edge cases and invalid types
    expect(Transformers.transformMoney(null as unknown as string)).toBeNaN();
    expect(Transformers.transformMoney(undefined as unknown as string)).toBeNaN();
    expect(Transformers.transformMoney({} as unknown as string)).toBeNaN();
    expect(Transformers.transformMoney([] as unknown as string)).toBeNaN();
    
    // Already a number should return the number itself
    expect(Transformers.transformMoney(123)).toBe(123);
    expect(Transformers.transformMoney(123.234)).toBe(123.234);
    expect(Transformers.transformMoney(2136892376478)).toBe(2136892376478);

    // Empty or whitespace strings
    expect(Transformers.transformMoney('')).toBe(0);
    expect(Transformers.transformMoney('   ')).toBe(0);

    // Invalid strings without digits
    expect(Transformers.transformMoney('abc')).toBe(0);
    expect(Transformers.transformMoney('!@#')).toBe(0);

    // Invalid number formats
    expect(Transformers.transformMoney('-')).toBeNaN();
    expect(Transformers.transformMoney('--123')).toBeNaN();
    expect(Transformers.transformMoney('1.23.45')).toBeNaN();
  });

  test('Transformers.transformDate', () => {
    expect(Transformers.transformDate('2023-10-01')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('01/10/2023')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('01.10.2023')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('2023.10.01')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('20/6/24')).toEqual(new Date('2024-06-20'));
    expect(Transformers.transformDate('1/6/24')).toEqual(new Date('2024-06-01'));
    
    // Invalid date inputs
    expect(() => Transformers.transformDate('invalid-date')).toThrowError('Failed to parse date: "invalid-date"');

    // US only logic
    getSpreadsheetLocaleMock.mockReturnValue('en_US');
    expect(Transformers.transformDate('10.01.2023')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('10/01/2023')).toEqual(new Date('2023-10-01'));
    expect(Transformers.transformDate('10/01/23')).toEqual(new Date('2023-10-01'));

    getSpreadsheetLocaleMock.mockReset();
  });
});
