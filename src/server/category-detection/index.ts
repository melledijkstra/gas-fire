import type { TableData } from '@/common/types';
import { FireTable } from '../fire-table';
import { detectCategoryByTextAnalysis } from './detection';
import { Logger } from '@/common/logger';

export function categorizeTransactions(data: TableData): {
  categoryUpdates: TableData;
  rowsCategorized: number;
} {
  Logger.time('categorizeTransactions');

  const fireTable = new FireTable(data);
  const categoryColIndex = fireTable.getColumnIndex('category');
  const contraAccountIndex = fireTable.getColumnIndex('contra_account');

  let rowsCategorized = 0;

  const categoryUpdates: Array<Array<string>> = [];

  // set the filter to only show rows that have no category
  // loop through all data and only process filtered rows
  // we start at second row because first row contains the column names
  for (let row = 1; row < data.length; row++) {
    const category = data[row][categoryColIndex] as string | undefined;
    const contraAccount = data[row][contraAccountIndex] as string | undefined;

    let newCategory = category;

    if (!category || category === '') {
      const detectedCategory = detectCategoryByTextAnalysis(contraAccount ?? '');
      if (detectedCategory) {
        newCategory = detectedCategory;
        Logger.log(`Row ${row + 1}: detected category "${detectedCategory}" for contra account "${contraAccount}"`)
        rowsCategorized++;
      }
    }

    categoryUpdates.push([newCategory ?? '']);
  }

  Logger.timeEnd('categorizeTransactions');

  return {
    categoryUpdates,
    rowsCategorized,
  };
}
