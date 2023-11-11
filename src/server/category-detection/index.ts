import { PROP_AUTOMATIC_CATEGORIES_CONFIG } from '../globals';

type CategoryDetectionConfigOld = Record<string, Array<RegExp>>;

export type CategoryDetectionConfig = Record<string, Array<string>>;

export const categoriesTermsMap: CategoryDetectionConfigOld = {
  'Food & Groceries': [
    /supermercado/,
    /supermercados/,
    /supermarkt/,
    /supermarket/,
    /eroski/,
    /mercadona/,
    /albert heijn/,
    /lidl/,
    /aldi/,
    /la despensa/,
    /spar/,
    /carrefour/,
    /alcampo/,
    /glovo/,
  ],
  Salary: [/adidas espana s.a./],
  'Bars, Restaurants & Clubs': [
    /faborit/,
    /bar colores sabores/,
    /santa gloria/,
    /planta calle/,
    /\bbar\b/,
    /restaurant/,
    /restaurante/,
    /rio de la plata/,
    /teranga/,
    /telepizza/,
    /tagliatella/,
  ],
  Income: [],
  'Household & Utilities': [],
  Debt: [],
  Subscriptions: [],
  Education: [],
  'Leisure & Entertainment': [/spotify/, /climbing/],
  'Personal Care': [],
  'Healthcare & Drug Stores': [],
  'Insurances & Finances': [],
  'Family, Friends & Donations': [],
  'Media & Electronics': [],
  'Transport & Car': [],
  'Travel & Holidays': [],
  'Savings & Investments': [],
  'Business expenses': [],
  Miscellaneous: [],
};

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
  const categoriesTermsMap = getCategoryMatchesMap();
  // lowercase the keyphrase for easier matching
  const lowercaseKeyphrase = keyphrase.toLowerCase();

  return Object.keys(categoriesTermsMap).find((category) =>
    categoriesTermsMap[category].some((term) =>
      new RegExp(term).test(lowercaseKeyphrase)
    )
  );
};
