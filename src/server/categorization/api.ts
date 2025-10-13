import { sourceSheet } from '../globals';
import {
  getCategoryNames,
  getColumnIndexByName,
} from '../helpers';
import { detectCategoryByTextAnalysis } from '../category-detection';

/**
 * Performs automatic categorization on the current active spreadsheet.
 * This function contains the core logic for categorization.
 * @returns {number} The number of rows categorized.
 */
export const performAutomaticCategorization = (): number => {
  const filter = sourceSheet?.getFilter();
  if (!filter) {
    throw new Error(
      'Automatic categorization script needs an actual filter configured on the source sheet table! Please set a filter before trying again'
    );
  }

  const categoryColIndex = getColumnIndexByName('category');
  const contraAccountIndex = getColumnIndexByName('contra_account');
  // we set a filter which hides all categories, leaving only rows without category
  // unfortunately there is no better way to do it currently
  const blankFilterCriteria = SpreadsheetApp.newFilterCriteria()
    .setHiddenValues(getCategoryNames())
    .build();

  filter.setColumnFilterCriteria(categoryColIndex + 1, blankFilterCriteria);

  let rowsCategorized = 0;
  const data = sourceSheet?.getDataRange()?.getValues() ?? [];

  for (let row = 1; row < data.length; row++) {
    const category = data[row][categoryColIndex];
    const contraAccount = data[row][contraAccountIndex];

    if (category && category !== '') {
      continue;
    }

    const detectedCategory = detectCategoryByTextAnalysis(contraAccount);

    if (detectedCategory) {
      sourceSheet
        ?.getRange(row + 1, categoryColIndex + 1)
        .setValue(detectedCategory);
      rowsCategorized++;
    }
  }

  return rowsCategorized;
};

/**
 * Performs automatic categorization on the current active spreadsheet.
 * This function handles the UI interaction and calls the core logic function.
 * Can be called from the menu.
 */
export const executeAutomaticCategorization = () => {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Do you want to run automatic categorization?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  sourceSheet?.activate();

  const rowsCategorized = performAutomaticCategorization();

  if (rowsCategorized === 0) {
    ui.alert('No rows were categorized!');
    return;
  }

  ui.alert(`Succesfully categorized ${rowsCategorized} rows!`);
};
