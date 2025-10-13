import { Config, SOURCE_SHEET_NAME } from '../config';
import { TableUtils, processTableWithImportRules } from '../table-utils';
import { n26Cols, openbankCols, raboCols } from '../types';
import type { ServerResponse, Table } from '@/common/types';
import { removeFilterCriteria } from '../helpers';
import { sourceSheet } from '../globals';
import { Transformers } from '../transformers';
import { isNumeric } from '../accounts/account-utils';
import { calculateNewBalance } from '../accounts/api';

export function processCSV(
  inputTable: Table,
  importStrategy: string
): ServerResponse {
  const strategies = Config.getConfig();

  // make the user visually switch to the primary sheet where data will be imported
  sourceSheet?.activate();
  sourceSheet?.showSheet();

  if (!(importStrategy in strategies)) {
    throw new Error(`Import strategy ${importStrategy} is not defined!`);
  }

  const filter = sourceSheet?.getFilter();
  if (filter) {
    if (!removeFilterCriteria(filter, true)) {
      throw new Error(
        'Filters need to be removed before importing, cancelling import'
      );
    }
  }

  const { beforeImport, columnImportRules, afterImport } =
    strategies[importStrategy];

  if (beforeImport) {
    for (const rule of beforeImport) {
      inputTable = rule(inputTable);
    }
  }

  let output = processTableWithImportRules(inputTable, columnImportRules);
  TableUtils.importData(output);

  if (afterImport) {
    for (const rule of afterImport) {
      rule(output);
    }
  }

  const msg = `imported ${output.length} rows!`;

  return {
    message: msg,
  };
}

export function generatePreview(
  table: Table,
  strategy: string
): {
  result: Table;
  newBalance?: number;
} {
  let amounts: string[] = [];
  switch (strategy) {
    case 'n26':
      amounts = TableUtils.retrieveColumn(table, n26Cols.Amount);
      break;
    case 'openbank':
      amounts = TableUtils.retrieveColumn(table, openbankCols.Importe);
      break;
    case 'rabobank':
      amounts = TableUtils.retrieveColumn(table, raboCols.Bedrag);
      break;
  }

  const amountNumbers = amounts
    .map((value) => Transformers.transformMoney(value))
    .filter(isNumeric);

  const newBalance = calculateNewBalance(strategy, amountNumbers);

  return { result: table, newBalance };
}
