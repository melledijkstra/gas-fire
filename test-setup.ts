import type { Mock } from 'vitest';
import { vi } from 'vitest';

// In order to test our server code we need the Google Apps Script globals to be available
// These are not available by default when we run vitest in node environment
// That is why we setup "polyfill" mocks to do the work for us
// We utilise the mocking functions from vitest to mock all the functionality

class Range {
  static readonly getLastRow = vi.fn(() => this);
  static readonly offset = vi.fn(() => this);
  static readonly getValues: Mock = vi.fn(() => []);
  static readonly getValue: Mock = vi.fn(() => '');
  static readonly setValue = vi.fn();
  static readonly setValues = vi.fn();
  static readonly autoFill = vi.fn();
}

class Filter {
  static readonly setColumnFilterCriteria = vi.fn();
  static readonly remove = vi.fn();
}

class Sheet {
  static readonly getSheetId = vi.fn();
  static readonly activate = vi.fn();
  static readonly showSheet = vi.fn();
  static readonly getFilter = vi.fn(() => Filter);
  static readonly getDataRange = vi.fn(() => Range);
  static readonly getRange = vi.fn(() => Range);
  static readonly clear = vi.fn();
  static readonly insertSheet = vi.fn();
  static readonly insertRowsBefore = vi.fn(() => Sheet);
}

class Spreadsheet {
  static readonly getSheets = vi.fn(() => [Sheet]);
  static readonly getRangeByName = vi.fn(() => Range);
  static readonly getSheetByName = vi.fn(() => Sheet);
  static readonly insertSheet = vi.fn(() => Sheet);
  static readonly getSpreadsheetLocale = vi.fn(() => 'en-US');
  static readonly getOwner = vi.fn(() => ({
    getEmail: vi.fn(() => 'test@example.com'),
  }));
}

class UI {
  static readonly Button = {
    YES: 'YES',
    NO: 'NO',
    OK: 'OK',
    CANCEL: 'CANCEL',
  };
  static readonly ButtonSet = {
    YES_NO: 'YES_NO',
    OK_CANCEL: 'OK_CANCEL',
  };
  static readonly alert = vi.fn();
  static readonly prompt = vi.fn();
}

class SpreadSheetApp {
  static readonly getActiveSpreadsheet = vi.fn(() => Spreadsheet);
  static readonly getUi = vi.fn(() => UI);
  static readonly newFilterCriteria = vi.fn(() => ({
    setHiddenValues: vi.fn(() => ({
      build: vi.fn(),
    })),
  }));
  static readonly AutoFillSeries = {
    DEFAULT_SERIES: 'DEFAULT_SERIES',
  };
}

class MailApp {
  static readonly sendEmail = vi.fn();
}

vi.stubGlobal('SpreadsheetApp', SpreadSheetApp);
vi.stubGlobal('Spreadsheet', Spreadsheet);
vi.stubGlobal('UI', UI);
vi.stubGlobal('MailApp', MailApp);

export const RangeMock = vi.mocked(Range);
export const SheetMock = vi.mocked(Sheet);
export const SpreadsheetMock = vi.mocked(Spreadsheet);
export const UIMock = vi.mocked(UI);
export const MailAppMock = vi.mocked(MailApp);
export const FilterMock = vi.mocked(Filter);
