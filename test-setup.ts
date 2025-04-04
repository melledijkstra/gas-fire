import { vi, type Mock } from 'vitest';

// In order to test our server code we need the Google Apps Script globals to be available
// These are not available by default when we run vitest in node environment
// That is why we setup "polyfill" mocks to do the work for us
// We utilise the mocking functions from vitest to mock all the functionality

class Range {
  static readonly getLastRow = vi.fn(() => this)
  static readonly offset = vi.fn(() => this)
  static readonly getValues: Mock = vi.fn(() => [])
}

class Sheet implements Partial<GoogleAppsScript.Spreadsheet.Sheet> {
  activate = vi.fn()
  showSheet = vi.fn()
  getSheetId = vi.fn()
  getSheetValues = vi.fn(() => [])
  getLastRow = vi.fn()
  getFilter = vi.fn()
}
  

class Spreadsheet {
  static readonly getSheets = vi.fn(() => [SheetMock])
  static readonly getRangeByName = vi.fn(() => Range)
  static readonly getSheetByName = vi.fn(() => SheetMock)
}

class SpreadSheetApp {
  static readonly getActiveSpreadsheet = vi.fn(() => Spreadsheet)
}

class CacheService {
  static readonly getDocumentCache = vi.fn(() => ({
    get: vi.fn(),
    put: vi.fn()
  }))
}

vi.stubGlobal('SpreadsheetApp', SpreadSheetApp);
vi.stubGlobal('Spreadsheet', Spreadsheet);
vi.stubGlobal('CacheService', CacheService);

export const RangeMock = vi.mocked(Range);
export const SheetMock = vi.mocked(new Sheet() as unknown as GoogleAppsScript.Spreadsheet.Sheet);
export const SpreadsheetMock = vi.mocked(Spreadsheet);
export const SpreadSheetAppMock = vi.mocked(SpreadSheetApp);
export const CacheServiceMock = vi.mocked(CacheService);
