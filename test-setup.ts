import { Mock, vi } from 'vitest';

// In order to test our server code we need the Google Apps Script globals to be available
// These are not available by default when we run vitest in node environment
// That is why we setup "polyfill" mocks to do the work for us
// We utilise the mocking functions from vitest to mock all the functionality

class Range {
  static getLastRow = vi.fn(() => this);
  static offset = vi.fn(() => this);
  static getValues: Mock = vi.fn(() => []);
  static getValue: Mock = vi.fn(() => '');
  static setValue = vi.fn();
  static setValues = vi.fn();
  static autoFill = vi.fn();
}

class Filter {
  static setColumnFilterCriteria = vi.fn();
  static remove = vi.fn();
}

class Sheet {
  static getSheetId = vi.fn();
  static activate = vi.fn();
  static showSheet = vi.fn();
  static getFilter = vi.fn(() => Filter);
  static getDataRange = vi.fn(() => Range);
  static getRange = vi.fn(() => Range);
  static clear = vi.fn();
  static insertSheet = vi.fn();
  static insertRowsBefore = vi.fn(() => Sheet);
}

class Spreadsheet {
  static getSheets = vi.fn(() => [Sheet]);
  static getRangeByName = vi.fn(() => Range);
  static getSheetByName = vi.fn(() => Sheet);
  static insertSheet = vi.fn(() => Sheet);
  static getSpreadsheetLocale = vi.fn(() => 'en-US');
  static getOwner = vi.fn(() => ({
    getEmail: vi.fn(() => 'test@example.com'),
  }));
}

class UI {
  static Button = {
    YES: 'YES',
    NO: 'NO',
    OK: 'OK',
    CANCEL: 'CANCEL',
  };
  static ButtonSet = {
    YES_NO: 'YES_NO',
    OK_CANCEL: 'OK_CANCEL',
  };
  static alert = vi.fn();
  static prompt = vi.fn();
}

class SpreadSheetApp {
  static getActiveSpreadsheet = vi.fn(() => Spreadsheet);
  static getUi = vi.fn(() => UI);
  static newFilterCriteria = vi.fn(() => ({
    setHiddenValues: vi.fn(() => ({
      build: vi.fn(),
    })),
  }));
  static AutoFillSeries = {
    DEFAULT_SERIES: 'DEFAULT_SERIES',
  };
}

class MailApp {
  static sendEmail = vi.fn();
}

vi.stubGlobal('SpreadsheetApp', SpreadSheetApp);
vi.stubGlobal('Spreadsheet', Spreadsheet);
vi.stubGlobal('UI', UI);
vi.stubGlobal('MailApp', MailApp);

export const RangeMock = vi.mocked(Range);
export const SheetMock = vi.mocked(Sheet);
export const SpreadsheetMock = vi.mocked(Spreadsheet);
export const SpreadSheetAppMock = vi.mocked(SpreadSheetApp);
export const UIMock = vi.mocked(UI);
export const MailAppMock = vi.mocked(MailApp);
export const FilterMock = vi.mocked(Filter);
