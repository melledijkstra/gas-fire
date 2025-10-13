import {
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  UIMock,
  MailAppMock,
} from '../../../test-setup';
import { Logger } from '@/common/logger';
import * as duplicateFinder from '../duplicate-finder';
import { executeFindDuplicates, mailNetWorth } from './api';

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  sourceSheet: SheetMock,
}));

const findDuplicatesSpy = vi.spyOn(duplicateFinder, 'findDuplicates');

Logger.disable();

describe('Common API', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeFindDuplicates', () => {
    test('should do nothing if user cancels', () => {
      UIMock.prompt.mockReturnValueOnce({ getSelectedButton: () => UIMock.Button.CANCEL });
      executeFindDuplicates();
      expect(findDuplicatesSpy).not.toHaveBeenCalled();
    });

    test('should show an alert if input is invalid', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => 'invalid',
      });
      executeFindDuplicates();
      expect(UIMock.alert).toHaveBeenCalledWith(
        'Invalid input! Please enter a valid number of days (e.g. 7)'
      );
    });

    test('should show an alert if no duplicates are found', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => '7',
      });
      findDuplicatesSpy.mockReturnValue([]);
      executeFindDuplicates();
      expect(UIMock.alert).toHaveBeenCalledWith('No duplicates found!');
    });

    test('should copy duplicates to a new sheet', () => {
      SheetMock.getDataRange.mockReturnValue(RangeMock);
      RangeMock.getValues.mockReturnValue([['header1', 'header2']]);
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => '7',
      });
      findDuplicatesSpy.mockReturnValue([
        ['row1'],
        ['row2'],
      ]);
      executeFindDuplicates();
      expect(SheetMock.clear).toHaveBeenCalled();
      expect(SheetMock.getRange).toHaveBeenCalledTimes(3);
      expect(UIMock.alert).toHaveBeenCalledWith(
        'Found 1 duplicates! Rows have been copied to the "duplicate-rows" sheet'
      );
    });
  });

  describe('mailNetWorth', () => {
    test('should send an email with the net worth', () => {
      RangeMock.getValue.mockReturnValueOnce(12345.67);
      SpreadsheetMock.getOwner.mockReturnValue({ getEmail: vi.fn(() => 'test@example.com') });
      SpreadsheetMock.getRangeByName.mockReturnValue(RangeMock);

      mailNetWorth();
      expect(MailAppMock.sendEmail).toHaveBeenCalled();
    });
  });
});
