import { CATEGORIES_SHEET_NAME } from './config';
import { FireColumn, FIRE_COLUMNS } from '../common/constants';

export const getColumnIndexByName = (column: FireColumn): number =>
  FIRE_COLUMNS.findIndex((col) => col.toLowerCase() === column);

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
