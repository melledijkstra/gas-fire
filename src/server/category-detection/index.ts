import { FireTable } from '../table';
import { Logger } from '@/common/logger';

export function categorizeTransactions(fireTable: FireTable): {
  categoryUpdates: string[][];
  rowsCategorized: number;
} {
  Logger.time('categorizeTransactions');

  const { categoryUpdates, rowsCategorized } = fireTable.categorize();

  Logger.timeEnd('categorizeTransactions');

  return {
    categoryUpdates,
    rowsCategorized,
  };
}
