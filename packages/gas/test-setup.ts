import { Mock, vi } from 'vitest';

// In order to test our server code we need the Google Apps Script globals to be available
// These are not available by default when we run vitest in node environment
// That is why we setup "polyfill" mocks to do the work for us
// We utilise the mocking functions from vitest to mock all the functionality

class Range {
  static getLastRow = vi.fn(() => this);
  static offset = vi.fn(() => this);
  static getValues: Mock<unknown[][]> = vi.fn(() => []);
}

class Sheet {
  static getSheetId = vi.fn<any, number>();
}

class Spreadsheet {
  static getSheets = vi.fn(() => [Sheet]);
  static getRangeByName = vi.fn((name: string) => Range);
}

class SpreadSheetApp {
  static getActiveSpreadsheet = vi.fn(() => Spreadsheet);
}

vi.stubGlobal('SpreadsheetApp', SpreadSheetApp);
vi.stubGlobal('Spreadsheet', Spreadsheet);

export const RangeMock = vi.mocked(Range);
export const SheetMock = vi.mocked(Sheet);
export const SpreadsheetMock = vi.mocked(Spreadsheet);
export const SpreadSheetAppMock = vi.mocked(SpreadSheetApp);
