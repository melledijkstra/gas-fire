import {
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  UIMock,
  FilterMock,
} from '../../../test-setup';
import { Logger } from '@/common/logger';
import * as categoryDetection from '../category-detection';
import { performAutomaticCategorization } from './api';

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  sourceSheet: SheetMock,
}));

vi.mock('../helpers', () => ({
  getCategoryNames: vi.fn(() => ['cat1', 'cat2']),
  getColumnIndexByName: vi.fn(name => {
    if (name === 'category') return 0;
    if (name === 'contra_account') return 1;
    return -1;
  }),
}));

const detectCategorySpy = vi.spyOn(
  categoryDetection,
  'detectCategoryByTextAnalysis'
);

Logger.disable();

describe('Categorization API', () => {
  beforeEach(() => {
    SheetMock.getFilter.mockReturnValue(FilterMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should return 0 if no rows were categorized', () => {
    RangeMock.getValues.mockReturnValue([
      ['category', 'contra_account'],
      ['cat1', 'account1'],
    ]);
    const result = performAutomaticCategorization();
    expect(result).toBe(0);
  });

  test('should categorize rows', () => {
    RangeMock.getValues.mockReturnValue([
      ['category', 'contra_account'],
      ['', 'account1'],
      ['', 'account2'],
    ]);
    detectCategorySpy.mockReturnValue('cat2');
    const result = performAutomaticCategorization();
    expect(detectCategorySpy).toHaveBeenCalledTimes(2);
    expect(result).toBe(2);
  });
});
