import { RangeMock, SpreadsheetMock } from '../../../test-setup';
import { Logger } from '@/common/logger';
import { getBankAccounts, getStrategyOptions } from './api';

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
}));

Logger.disable();

describe('Accounts API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getBankAccounts', () => {
    test('in case there are no accounts, it should return an empty object', () => {
      RangeMock.getValues.mockReturnValue([[], []]);
      const result = getBankAccounts();
      expect(result).toEqual({});
    });

    test('should return a list of bank accounts', () => {
      RangeMock.getValues
        .mockReturnValueOnce([['n26'], ['Openbank']])
        .mockReturnValueOnce([['DB123456789'], ['BANK123456789']]);
      const result = getBankAccounts();
      expect(result).toEqual({
        n26: 'DB123456789',
        Openbank: 'BANK123456789',
      });
    });
  });

  describe('getStrategyOptions', () => {
    test('should return a list of strategy options', () => {
      RangeMock.getValues.mockReturnValue([
        ['n26'],
        ['Openbank'],
        ['Trading 212'],
      ]);
      const result = getStrategyOptions();
      expect(result).toEqual({
        n26: 'n26',
        openbank: 'Openbank',
        trading_212: 'Trading 212',
      });
    });
  });
});
