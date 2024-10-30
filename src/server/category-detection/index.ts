import { PROP_AUTOMATIC_CATEGORIES_CONFIG } from '../globals';

type CategoryDetectionConfigOld = Record<string, Array<RegExp>>;

export type CategoryDetectionConfig = Record<string, Array<string>>;

export const categoriesTermsMap: CategoryDetectionConfigOld = {
  'Food & Groceries': [
    /supermercado|supermercados/,
    /supermarkt|supermarket/,
    /albert heijn|jumbo|spar/,
    /lidl|aldi/,
    /glovo|ubereats|uber eats/,
    /mercadona|superdino|lupa|alcampo|carrefour|la despensa|eroski/,
  ],
  Salary: [/adidas espana s.a./],
  'Bars, Restaurants & Clubs': [
    /restaurant|restaurante/,
    /cafe|cafeteria|cafetaría/,
    /faborit/,
    /santa gloria/,
    /planta calle/,
    /\bbar\b/,
    /rio de la plata/,
    /teranga/,
    /telepizza/,
    /tagliatella/,
    /mcdonalds|\bkfc\b|starbucks|burger king|domino's|taco bell|papa john|tim horton/,
  ],
  Income: [],
  'Household & Utilities': [
    /iberdrola/,
    /hergar rio sl/,
    /canal de isabel/,
    /ikea/,
    /\bdigi\b/,
  ],
  Debt: [],
  Subscriptions: [/spotify/, /openai/],
  Education: [],
  'Leisure & Entertainment': [/climbing/],
  'Personal Care': [
    /\bbarber|kapper|kapsalon|peluqueria|peluquería|peluqueros/,
    /basicfit|basic-fit/,
    /\bzara|pull&bear|pull and bear|\bmango\b|decathlon|superdry|el corte ingles|\bc&a\b|\bbershka\b|zalando/,
    /\badidasnl\b|\badidases\b/,
    /fisionarte/,
  ],
  'Healthcare & Drug Stores': [/pharmacy|apotheek|apotheken|farmacia/],
  'Insurances & Finances': [],
  'Family, Friends & Donations': [],
  'Media & Electronics': [/media markt/, /google/],
  'Transport & Car': [/aparcamientos|parking/],
  'Travel & Holidays': [],
  'Savings & Investments': [/\bdegiro\b/],
  'Business expenses': [],
  Miscellaneous: [],
};

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
