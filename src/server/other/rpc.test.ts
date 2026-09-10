import { YMYLTable } from '@/common/table/YMYLTable'
import {
  MailAppMock,
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  UIMock,
} from '../../../test-setup'
import { executeFindDuplicates, mailNetWorth } from '../other/rpc'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'

vi.mock('../globals', () => ({
  YMYLSpreadsheet: SpreadsheetMock,
  getSourceSheet: vi.fn(() => SheetMock),
}))

const findDuplicatesSpy = vi.spyOn(YMYLTable.prototype, 'findDuplicates')
const getDataSpy = vi.spyOn(YMYLSheet.prototype, 'getDataTable')

describe('RPC: Miscellaneous Functions', () => {
  describe('executeFindDuplicates', () => {
    test('should do nothing if user cancels', () => {
      UIMock.prompt.mockReturnValueOnce({ getSelectedButton: () => UIMock.Button.CANCEL })
      executeFindDuplicates()
      expect(findDuplicatesSpy).not.toHaveBeenCalled()
    })

    test('should show an alert if input is invalid', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => 'invalid',
      })
      executeFindDuplicates()
      expect(UIMock.alert).toHaveBeenCalledWith(
        'Invalid input! Please enter a valid number of days (e.g. 7)',
      )
    })

    test('should show an alert if no duplicates are found', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => '7',
      })
      getDataSpy.mockReturnValueOnce(new YMYLTable([]))
      findDuplicatesSpy.mockReturnValue(new YMYLTable([]))
      executeFindDuplicates()
      expect(UIMock.alert).toHaveBeenCalledWith('No duplicates found!')
    })

    test('should copy duplicates to a new sheet', () => {
      UIMock.prompt.mockReturnValueOnce({
        getSelectedButton: () => UIMock.Button.OK,
        getResponseText: () => '7',
      })
      getDataSpy.mockReturnValueOnce(new YMYLTable([
        ['1', 'NL01', '2023-01-01', '100', '', 'Store A', '', '', '', '', '', '', '', '', '', ''],
      ]))
      findDuplicatesSpy.mockReturnValue(new YMYLTable([
        ['row1', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
        ['row2', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
      ]))
      executeFindDuplicates()
      expect(SheetMock.clear).toHaveBeenCalled()
      expect(SheetMock.getRange).toHaveBeenCalledTimes(2)
      expect(UIMock.alert).toHaveBeenCalledWith(
        'Found 1 duplicates! Rows have been copied to the "duplicate-rows" sheet',
      )
    })
  })

  describe('mailNetWorth', () => {
    test('should send an email with the net worth', () => {
      RangeMock.getValue.mockReturnValueOnce(12345.67)
      SpreadsheetMock.getOwner.mockReturnValue({ getEmail: vi.fn(() => 'test@example.com') })
      SpreadsheetMock.getRangeByName.mockReturnValue(RangeMock)

      mailNetWorth()
      expect(MailAppMock.sendEmail).toHaveBeenCalled()
    })
  })
})
