import { PROP_AUTOMATIC_CATEGORIES_CONFIG } from '@/common/constants';
import { Logger } from '@/common/logger';
import { categoriesTermsMap } from './category-term-map';
import type { CategoryDetectionConfig } from './types';

// @ts-expect-error -- PropertiesService is a global provided by the Google Apps Script environment
const _getCategoryMatchesMap = (): CategoryDetectionConfig => {
  try {
    const storeObject = PropertiesService.getDocumentProperties().getProperty(
      PROP_AUTOMATIC_CATEGORIES_CONFIG
    );

    if (!storeObject) {
      return {};
    }

    return JSON.parse(storeObject);
  } catch (ignore) {
    Logger.log('Error while fetching category detection config', ignore);
  }

  return {};
};

/**
 * Function that detects automatically a category based on some simple text analysis (text matching)
 */
export const detectCategoryByTextAnalysis = (
  keyphrase: string
): string | undefined => {
  // const categoriesTermsMap = getCategoryMatchesMap();
  // lowercase the keyphrase for easier matching
  const lowercaseKeyphrase = keyphrase.toLowerCase();

  return Object.keys(categoriesTermsMap).find((category) =>
    categoriesTermsMap[category].some((term) =>
      new RegExp(term).test(lowercaseKeyphrase)
    )
  );
};
