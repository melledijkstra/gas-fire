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
    .replaceAll(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
    .replaceAll(/\s+/g, '-') // replace spaces with hyphens
    .replaceAll(/-+/g, '-'); // remove consecutive hyphens

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

export function structuredCloneFallback<T>(input: T): T {
  if (input === null || typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map((item) => structuredCloneFallback(item)) as T;
  }

  if (input instanceof Date) {
    return new Date(input) as T;
  }

  if (input instanceof RegExp) {
    return new RegExp(input) as T;
  }

  if (input instanceof Map) {
    const clone = new Map();
    for (const [key, value] of input) {
      clone.set(structuredCloneFallback(key), structuredCloneFallback(value));
    }
    return clone as T;
  }

  if (input instanceof Set) {
    const clone = new Set();
    for (const value of input) {
      clone.add(structuredCloneFallback(value));
    }
    return clone as T;
  }

  if (isRecord(input)) {
    const clonedObject: Record<string, unknown> = {};
    for (const key in input) {
      if (Object.hasOwn(input, key)) {
        clonedObject[key] = structuredCloneFallback(input[key]);
      }
    }
    return clonedObject as T;
  }

  return input;
}

export function structuredClone<T>(input: T): T {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(input);
  }

  return structuredCloneFallback(input);
}