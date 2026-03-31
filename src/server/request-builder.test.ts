import { describe, expect, it, beforeEach } from 'vitest';
import { SheetsRequestBuilder } from './request-builder';

describe('SheetsRequestBuilder', () => {
  let builder: SheetsRequestBuilder;

  beforeEach(() => {
    builder = new SheetsRequestBuilder();
  });

  it('should initialize with an empty requests array', () => {
    expect(builder.requests).toEqual([]);
  });

  describe('insertRows', () => {
    it('should build a request to insert rows with default inheritance', () => {
      builder.insertRows(123, 5, 10);

      expect(builder.requests).toHaveLength(1);
      expect(builder.requests[0]).toEqual({
        insertDimension: {
          range: {
            sheetId: 123,
            dimension: 'ROWS',
            startIndex: 5,
            endIndex: 15,
          },
          inheritFromBefore: false,
        },
      });
    });

    it('should build a request to insert rows with inheritFromBefore = true', () => {
      builder.insertRows(123, 5, 10, true);

      expect(builder.requests).toHaveLength(1);
      expect(builder.requests[0]).toEqual({
        insertDimension: {
          range: {
            sheetId: 123,
            dimension: 'ROWS',
            startIndex: 5,
            endIndex: 15,
          },
          inheritFromBefore: true,
        },
      });
    });

    it('should return this to allow chaining', () => {
      const result = builder.insertRows(123, 5, 10);
      expect(result).toBe(builder);
    });
  });

  describe('insertData', () => {
    it('should build an updateCells request with given data and cell generator', () => {
      const data = [
        ['A1', 'B1'],
        ['A2', 'B2'],
      ];

      const generator = (cell: unknown): GoogleAppsScript.Sheets.Schema.CellData => ({
        userEnteredValue: { stringValue: String(cell) },
      });

      builder.insertData(123, data, 10, 5, generator);

      expect(builder.requests).toHaveLength(1);
      expect(builder.requests[0]).toEqual({
        updateCells: {
          rows: [
            { values: [{ userEnteredValue: { stringValue: 'A1' } }, { userEnteredValue: { stringValue: 'B1' } }] },
            { values: [{ userEnteredValue: { stringValue: 'A2' } }, { userEnteredValue: { stringValue: 'B2' } }] },
          ],
          fields: 'userEnteredValue',
          range: {
            sheetId: 123,
            startRowIndex: 10,
            endRowIndex: 12,
            startColumnIndex: 5,
            endColumnIndex: 7,
          },
        },
      });
    });

    it('should build an updateCells request with custom fields', () => {
      const data = [['A1']];
      const generator = (cell: unknown): GoogleAppsScript.Sheets.Schema.CellData => ({
        userEnteredValue: { stringValue: String(cell) },
      });

      builder.insertData(123, data, 10, 5, generator, 'userEnteredValue,userEnteredFormat');

      expect(builder.requests).toHaveLength(1);
      expect(builder.requests[0]?.updateCells?.fields).toBe('userEnteredValue,userEnteredFormat');
    });

    it('should handle an empty data array correctly', () => {
      const data: unknown[][] = [];
      const generator = (cell: unknown): GoogleAppsScript.Sheets.Schema.CellData => ({
        userEnteredValue: { stringValue: String(cell) },
      });

      builder.insertData(123, data, 10, 5, generator);

      expect(builder.requests).toHaveLength(1);
      expect(builder.requests[0]).toEqual({
        updateCells: {
          rows: [],
          fields: 'userEnteredValue',
          range: {
            sheetId: 123,
            startRowIndex: 10,
            endRowIndex: 10,
            startColumnIndex: 5,
            endColumnIndex: 5,
          },
        },
      });
    });

    it('should return this to allow chaining', () => {
      const data = [['A1']];
      const result = builder.insertData(123, data, 10, 5, (_c) => ({}));
      expect(result).toBe(builder);
    });
  });

  describe('autoFill', () => {
    it('should build an autoFill request with default dimension and alternate series flag', () => {
      const sourceRange = {
        sheetId: 123,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 1,
        endColumnIndex: 2,
      };

      builder.autoFill(sourceRange, 5);

      expect(builder.requests).toHaveLength(1);
      expect(builder.requests[0]).toEqual({
        autoFill: {
          useAlternateSeries: false,
          sourceAndDestination: {
            source: sourceRange,
            dimension: 'ROWS',
            fillLength: 5,
          },
        },
      });
    });

    it('should build an autoFill request with custom dimension and alternate series flag', () => {
      const sourceRange = {
        sheetId: 123,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 1,
        endColumnIndex: 2,
      };

      builder.autoFill(sourceRange, 5, 'COLUMNS', true);

      expect(builder.requests).toHaveLength(1);
      expect(builder.requests[0]).toEqual({
        autoFill: {
          useAlternateSeries: true,
          sourceAndDestination: {
            source: sourceRange,
            dimension: 'COLUMNS',
            fillLength: 5,
          },
        },
      });
    });

    it('should return this to allow chaining', () => {
      const sourceRange = {
        sheetId: 123,
        startRowIndex: 1,
        endRowIndex: 2,
        startColumnIndex: 1,
        endColumnIndex: 2,
      };

      const result = builder.autoFill(sourceRange, 5);
      expect(result).toBe(builder);
    });
  });

  describe('chaining', () => {
    it('should support chaining multiple methods', () => {
      builder
        .insertRows(123, 5, 10)
        .autoFill({ sheetId: 123 }, 5);

      expect(builder.requests).toHaveLength(2);
      expect(builder.requests[0]).toHaveProperty('insertDimension');
      expect(builder.requests[1]).toHaveProperty('autoFill');
    });
  });
});
