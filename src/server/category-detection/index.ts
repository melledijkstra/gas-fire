import type { Table } from '@/common/types';
import { TableUtils } from '../table-utils';
import { detectCategoryByTextAnalysis } from './detection';
import { Logger } from '@/common/logger';

export function categorizeTransactions(data: Table): {
  categoryUpdates: Table;
  rowsCategorized: number;
} {
  Logger.time('categorizeTransactions');

  const categoryColIndex = TableUtils.getFireColumnIndexByName('category');
  const contraAccountIndex = TableUtils.getFireColumnIndexByName('contra_account');

  let rowsCategorized = 0;

  const categoryUpdates: Array<Array<string>> = [];

  // set the filter to only show rows that have no category
  // loop through all data and only process filtered rows
  // we start at second row because first row contains the column names
  for (let row = 1; row < data.length; row++) {
    const category = data[row][categoryColIndex];
    const contraAccount = data[row][contraAccountIndex];

    let newCategory = category;

    if (!category || category === '') {
      const detectedCategory = detectCategoryByTextAnalysis(contraAccount);
      if (detectedCategory) {
        newCategory = detectedCategory;
        Logger.log(`Row ${row + 1}: detected category "${detectedCategory}" for contra account "${contraAccount}"`)
        rowsCategorized++;
      }
    }

    categoryUpdates.push([newCategory]);
  }

  Logger.timeEnd('categorizeTransactions');

  return {
    categoryUpdates,
    rowsCategorized,
  };
}
