import { bench, describe, vi, beforeAll, afterAll } from 'vitest';
import { executeAutomaticCategorization } from './remote-calls';
import { RangeMock, SheetMock, UIMock, FilterMock } from '../../test-setup';
import * as categoryDetection from './category-detection/detection';

vi.mock('./globals', () => ({
  getSourceSheet: vi.fn(() => SheetMock)
}));

vi.mock('./helpers', async (actualImport) => ({
  ...(await actualImport<typeof import('./helpers')>()),
  getCategoryNames: vi.fn(() => ['cat1', 'cat2']),
}));

vi.mock('./table-utils', async (actualImport) => {
  const actual = await actualImport<typeof import('./table-utils')>();
  return {
    ...actual,
    TableUtils: {
      ...actual.TableUtils,
      getFireColumnIndexByName: vi.fn(name => {
        if (name === 'category') return 0;
        if (name === 'contra_account') return 1;
        return -1;
      })
    }
  };
});

describe('executeAutomaticCategorization benchmark', () => {
  beforeAll(() => {
    vi.spyOn(categoryDetection, 'detectCategoryByTextAnalysis').mockReturnValue('cat1');
    SheetMock.getFilter.mockReturnValue(FilterMock);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  bench('executeAutomaticCategorization with 1000 rows', () => {
    UIMock.alert.mockReturnValue(UIMock.Button.YES);
    RangeMock.getValues.mockReturnValue([
      ['category', 'contra_account'],
      ...Array.from({ length: 1000 }, () => ['', 'account1'])
    ]);
    executeAutomaticCategorization();
  });
});
