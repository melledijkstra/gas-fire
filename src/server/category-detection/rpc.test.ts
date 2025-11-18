import {
  RangeMock,
  SheetMock,
  SpreadsheetMock,
  UIMock
} from '../../../test-setup';
import * as categoryDetection from '../category-detection/detection';
import { executeAutomaticCategorization } from '../category-detection/rpc';

vi.mock('../globals', () => ({
  FireSpreadsheet: SpreadsheetMock,
  getSourceSheet: vi.fn(() => SheetMock)
}));

vi.mock('../helpers', async (actualImport) => ({
  ...await actualImport<typeof import('../helpers')>(),
  getCategoryNames: vi.fn(() => ['cat1', 'cat2']),
  getColumnIndexByName: vi.fn(name => {
    if (name === 'category') return 0;
    if (name === 'contra_account') return 1;
    return -1;
  }),
}))

const detectCategorySpy = vi.spyOn(
  categoryDetection,
  'detectCategoryByTextAnalysis'
);

describe('RPC: Automatic Categorization', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('executeAutomaticCategorization', () => {
    test('should do nothing if user cancels', () => {
      UIMock.alert.mockReturnValueOnce(UIMock.Button.NO);
      executeAutomaticCategorization();
      expect(UIMock.alert).toHaveBeenCalled();
      expect(detectCategorySpy).not.toHaveBeenCalled();
    });

    test('should show an alert if no rows were categorized', () => {
      UIMock.alert.mockReturnValueOnce(UIMock.Button.YES);
      RangeMock.getValues.mockReturnValue([
        ['', 'category', 'contra_account'],
        ['cat1', 'account1'],
      ]);
      executeAutomaticCategorization();
      expect(UIMock.alert).toHaveBeenCalledWith('No rows were categorized!');
    });

    test('should categorize rows', () => {
      UIMock.alert.mockReturnValueOnce(UIMock.Button.YES);
      RangeMock.getValues.mockReturnValue([
        ['ref', 'date', 'amount', 'description', 'category', 'contra_account', '', '', '', 'category'],
        ['', '', '', '', '', 'account1', '', '', '', ''],
        ['', '', '', '', '', 'account2', '', '', '', ''],
      ]);
      detectCategorySpy.mockReturnValue('cat2');
      executeAutomaticCategorization();
      expect(detectCategorySpy).toHaveBeenCalledTimes(2);
      expect(UIMock.alert).toHaveBeenCalledWith('Succesfully categorized 2 rows!');
    });
  });
});
