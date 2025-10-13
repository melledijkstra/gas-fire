import { CATEGORIES_SHEET_NAME } from './config';

export const getCategoryNames = (): string[] => {
  const categorySheet = SpreadsheetApp.getActive().getSheetByName(
    CATEGORIES_SHEET_NAME
  );

  const categories = categorySheet
    // the category names are in the 3rd row
    .getRange(3, 1, 1, categorySheet.getLastColumn())
    .getValues()?.[0];

  if (Array.isArray(categories)) {
    return categories;
  }

  return [];
};

export const slugify = (text: string): string =>
  text.trim() // trim leading/trailing white space
      .toLowerCase() // convert string to lowercase
      .replace(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
      .replace(/\s+/g, '-') // replace spaces with hyphens
      .replace(/-+/g, '-'); // remove consecutive hyphens

export function structuredCloneFallback(input: any): any {
  if (input === null || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map(structuredCloneFallback);
  }
  const clonedObject: Record<string, any> = {};
  for (const key in input) {
    if (input.hasOwnProperty(key)) {
      clonedObject[key] = structuredCloneFallback(input[key]);
    }
  }
  return clonedObject;
}

export function structuredClone<T>(input: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(input);
  }
  return structuredCloneFallback(input);
}