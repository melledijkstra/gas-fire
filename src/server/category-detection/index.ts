import { PROP_AUTOMATIC_CATEGORIES_CONFIG } from '../../common/constants';
import { categoriesTermsMap } from './category-term-map';
import { CategoryDetectionConfig } from './types';

// @ts-ignore
const getCategoryMatchesMap = (): CategoryDetectionConfig => {
  try {
    const storeObject = PropertiesService.getDocumentProperties().getProperty(
      PROP_AUTOMATIC_CATEGORIES_CONFIG
    );

    if (!storeObject) {
      return {};
    }

    return JSON.parse(storeObject);
  } catch (ignore) {
    console.log(ignore);
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
