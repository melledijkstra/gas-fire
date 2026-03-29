import { getSourceSheet } from '../globals';
import { TableUtils } from '../table-utils';
import { getCategoryNames } from '../helpers';
import { Logger } from '@/common/logger';
import { categorizeTransactions } from '.';

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

  try {
    Logger.time('executeAutomaticCategorization')

    sourceSheet?.activate()

    const filter = sourceSheet?.getFilter()
    if (!filter) {
      throw new Error(
        'Automatic categorization script needs an actual filter configured on the source sheet table! Please set a filter before trying again'
      );
    }

    const categoryColIndex = TableUtils.getFireColumnIndexByName('category')
    // we set a filter which hides all categories, leaving only rows without category
    // unfortunately there is no better way to do it currently
    const blankFilterCriteria = SpreadsheetApp.newFilterCriteria()
      .setHiddenValues(getCategoryNames())
      .build()

    filter.setColumnFilterCriteria(categoryColIndex + 1, blankFilterCriteria)

    // below code is the actual categorization logic
    // all the code before is just visually for the user
    const data = sourceSheet?.getDataRange()?.getValues() ?? []

    // actual categorization logic
    const { categoryUpdates, rowsCategorized } = categorizeTransactions(data)

    if (rowsCategorized === 0) {
      ui.alert('No rows were categorized!');
      return;
    }

    if (categoryUpdates.length > 0) {
      sourceSheet
        ?.getRange(2, categoryColIndex + 1, categoryUpdates.length, 1)
        .setValues(categoryUpdates);
    }

    ui.alert(`Succesfully categorized ${rowsCategorized} rows!`);
    Logger.timeEnd('executeAutomaticCategorization');
  } catch (error) {
    Logger.error(error);
    ui.alert(`An error occurred during categorization: ${error instanceof Error ? error.message : String(error)}`);
  }
};
