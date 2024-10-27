import { detectCategoryByTextAnalysis } from './index';

describe('detectCategoryByTextAnalysis', () => {
  test('should return the correct category for a given keyphrase', () => {
    expect(detectCategoryByTextAnalysis('supermercado')).toBe(
      'Food & Groceries'
    );
    expect(detectCategoryByTextAnalysis('adidas espana s.a.')).toBe('Salary');
    expect(detectCategoryByTextAnalysis('restaurant')).toBe(
      'Bars, Restaurants & Clubs'
    );
    expect(detectCategoryByTextAnalysis('ikea')).toBe('Household & Utilities');
    expect(detectCategoryByTextAnalysis('spotify')).toBe('Subscriptions');
    expect(detectCategoryByTextAnalysis('climbing')).toBe(
      'Leisure & Entertainment'
    );
    expect(detectCategoryByTextAnalysis('barberia')).toBe('Personal Care');
    expect(detectCategoryByTextAnalysis('pharmacy')).toBe(
      'Healthcare & Drug Stores'
    );
    expect(detectCategoryByTextAnalysis('media markt')).toBe(
      'Media & Electronics'
    );
    expect(detectCategoryByTextAnalysis('Parking')).toBe('Transport & Car');
    expect(detectCategoryByTextAnalysis('DEGIRO')).toBe(
      'Savings & Investments'
    );
  });

  test('should return undefined for a keyphrase that does not match any category', () => {
    expect(detectCategoryByTextAnalysis('unknown term')).toBeUndefined();
  });
});
