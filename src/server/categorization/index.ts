import { getSourceSheet } from '../globals';
import { TableUtils } from '../table-utils';
import { getCategoryNames } from '../helpers';
import { detectCategoryByTextAnalysis } from '../category-detection';

const categorize = () => {
  const sourceSheet = getSourceSheet()
  let rowsCategorized = 0;
  const data = sourceSheet?.getDataRange()?.getValues() ?? [];
  const categoryColIndex = TableUtils.getFireColumnIndexByName('category');
  const contraAccountIndex = TableUtils.getFireColumnIndexByName('contra_account');

  // set the filter to only show rows that have no category
  // loop through all data and only process filtered rows
  // we start at second row because first row contains the column names
  for (let row = 1; row < data.length; row++) {
    const category = data[row][categoryColIndex];
    const contraAccount = data[row][contraAccountIndex];

    // skip all rows which already have category set
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
}

/**
 * Performs automatic categorization on the current active spreadsheet
 * Can be called from the menu
 */
export const executeAutomaticCategorization = () => {
  const sourceSheet = getSourceSheet()

  // 1. first part of the code focusses UX and makes sure the user is focussed on the right sheet
  // also it filters the sheet to only show rows that have no category set
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    'Do you want to run automatic categorization?',
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) {
    return;
  }

  sourceSheet?.activate();

  const filter = sourceSheet?.getFilter();
  if (!filter) {
    throw new Error(
      'Automatic categorization script needs an actual filter configured on the source sheet table! Please set a filter before trying again'
    );
  }

  const categoryColIndex = TableUtils.getFireColumnIndexByName('category');
  // we set a filter which hides all categories, leaving only rows without category
  // unfortunately there is no better way to do it currently
  const blankFilterCriteria = SpreadsheetApp.newFilterCriteria()
    .setHiddenValues(getCategoryNames())
    .build();

  filter.setColumnFilterCriteria(categoryColIndex + 1, blankFilterCriteria);

  // below code is the actual categorization logic
  // all the code before is just visually for the user
  const rowsCategorized = categorize();

  if (rowsCategorized === 0) {
    ui.alert('No rows were categorized!');
    return;
  }

  ui.alert(`Succesfully categorized ${rowsCategorized} rows!`);
};
