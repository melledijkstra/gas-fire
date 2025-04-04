import { vi, type Mock } from 'vitest';

// In order to test our server code we need the Google Apps Script globals to be available
// These are not available by default when we run vitest in node environment
// That is why we setup "polyfill" mocks to do the work for us
// We utilise the mocking functions from vitest to mock all the functionality

class Range {
  getLastRow = vi.fn(() => this).bind(this)
  offset = vi.fn(() => this).bind(this)
  getValues: Mock = vi.fn(() => [])
}

export const RangeMock = vi.mocked(new Range());

class Sheet implements Partial<GoogleAppsScript.Spreadsheet.Sheet> {
  activate = vi.fn()
  showSheet = vi.fn()
  getSheetId = vi.fn()
  getSheetValues = vi.fn(() => [])
  getLastRow = vi.fn()
  getFilter = vi.fn()
}

export const SheetMock = vi.mocked(new Sheet() as unknown as GoogleAppsScript.Spreadsheet.Sheet);

class Spreadsheet {
  getSheets = vi.fn(() => [SheetMock])
  getRangeByName = vi.fn(() => RangeMock)
  getSheetByName = vi.fn(() => SheetMock)
}

export const SpreadsheetMock = vi.mocked(new Spreadsheet()  as unknown as GoogleAppsScript.Spreadsheet.Spreadsheet);

class SpreadSheetApp {
  getActiveSpreadsheet = vi.fn(() => SpreadsheetMock);
}

export const SpreadSheetAppMock = vi.mocked(new SpreadSheetApp());

class CacheService {
  getDocumentCache = vi.fn(() => ({
    get: vi.fn(),
    put: vi.fn()
  }))
}

export const CacheServiceMock = vi.mocked(new CacheService());

vi.stubGlobal('SpreadsheetApp', SpreadSheetAppMock);
vi.stubGlobal('CacheService', CacheServiceMock);
