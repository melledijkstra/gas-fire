import { CATEGORIES_SHEET_NAME } from './config';
import { type FireColumn, FIRE_COLUMNS } from '@/common/constants';

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

/**
 * Removes all filter criterias present on the given filter
 * Can optionally prompt the user before removing the criterias
 *
 * @param {GoogleAppsScript.Spreadsheet.Filter} filter - the filter to remove the criterias from
 * @param {boolean} prompt - whether to prompt the user before removing the criterias
 * @returns {boolean} - true if the criterias were removed, false if the user decided not to remove them
 */
export const removeFilterCriteria = (
  filter: GoogleAppsScript.Spreadsheet.Filter,
  prompt = false
): boolean => {
  const ui = SpreadsheetApp.getUi();
  // the amount of columns spanning the filter
  const columns = filter.getRange().getNumColumns();
  // the column index where the filter starts
  const startColumn = filter.getRange().getColumn();
  const columnsWithCriteria = [];
  for (let col = 0; col < columns; col++) {
    const currentColumn = startColumn + col;
    const currentColumnCriteria = filter.getColumnFilterCriteria(currentColumn);
    if (currentColumnCriteria) {
      columnsWithCriteria.push(currentColumn);
    }
  }

  if (columnsWithCriteria.length === 0) {
    // no columns with criteria, nothing to do
    // return true because there are no criteria set
    return true;
  }

  let shouldRemoveCriterias = true;

  if (prompt) {
    const response = ui.alert(
      'This action requires active filter criterias to be removed\nRemove them and continue?',
      ui.ButtonSet.YES_NO
    );

    shouldRemoveCriterias = response === ui.Button.YES;
  }

  if (shouldRemoveCriterias) {
    for (const colIndex of columnsWithCriteria) {
      filter.removeColumnFilterCriteria(colIndex);
    }
    // make sure operations are executed and finished before continuing
    // otherwise the filter might not be removed on time
    SpreadsheetApp.flush();
    return true;
  }

  // return false, because there are still criterias set
  // and the user decided not to remove them
  return false;
};

export const slugify = (text: string): string =>
  text.replace(/^(\s+)|(\s+)$/g, '') // trim leading/trailing white space
      .toLowerCase() // convert string to lowercase
      .replace(/[^a-z0-9 -]/g, '') // remove any non-alphanumeric characters
      .replace(/\s+/g, '-') // replace spaces with hyphens
      .replace(/-+/g, '-'); // remove consecutive hyphens
