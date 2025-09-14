import { FireSpreadsheet, sourceSheet } from './globals';
import { Config } from './config';
import { TableUtils, processTableWithImportRules } from './table-utils';
import { n26Cols, openbankCols, raboCols } from './types';
import type { StrategyOptions, ServerResponse, Table } from '@/common/types';
import { AccountUtils, isNumeric } from './account-utils';
import { Transformers } from './transformers';
import {
  getCategoryNames,
  getColumnIndexByName,
  removeFilterCriteria,
} from './helpers';
import { detectCategoryByTextAnalysis } from './category-detection';
import { NAMED_RANGES } from '../common/constants';
import { findDuplicates } from './duplicate-finder';

const cleanString = (str: string) => str?.replace(/\n/g, ' ').trim();

/**
 * This retrieves the bank accounts set by the user.
 * It uses 2 named ranges to combine them together as a usable object
 * @returns An object where the key is the label of the bank and the value the IBAN
 * @rpc_from dialogs/tabs/bank_accounts.html
 */
export function getBankAccounts(): Record<string, string> {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  // retrieve account names and ibans
  // the ranges should only have one column so we use .flat()
  const accountNames = sheet
    .getRangeByName(NAMED_RANGES.accountNames)
    ?.getValues()
    .flat() as Array<string>;
  const ibans = sheet
    .getRangeByName(NAMED_RANGES.accounts)
    ?.getValues()
    .flat() as Array<string>;

  const bankAccounts: Record<string, string> = {};

  ibans?.forEach((iban, index) => {
    const label = cleanString(accountNames?.[index]);
    const cleanIban = cleanString(iban);

    if (cleanIban) {
      // this sets the label as the key and the iban as the value
      bankAccounts[label] = cleanIban;
    }
  });

  return bankAccounts;
}

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

export function calculateNewBalance(
  strategy: string,
  values: number[]
) {
  let balance = AccountUtils.getBalance(strategy);

  for (const amount of values) {
    balance += amount;
  }

  return balance;
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

/**
 * This function returns the strategy options available to the client side
 */
export function getStrategyOptions(): StrategyOptions {
  const accountNames = FireSpreadsheet.getRangeByName(NAMED_RANGES.accountNames);
  const accounts = accountNames
    .getValues()
    // make sure not to include empty rows
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    // flatten out the array so it is 1 dimensional with account names
    .flat();

  // we convert the account names to slugs and return them as an object
  const result = accounts.reduce<Record<string, string>>((obj: Record<string, string>, account: string) => {
    const slug = account.toLowerCase().replaceAll(' ', '_');
    obj[slug] = account;
    return obj;
  }, {});

  return result;
}

/**
 * Performs automatic categorization on the current active spreadsheet
 * Can be called from the menu
 */
export const executeAutomaticCategorization = () => {
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
      'Automatic categorization script needs a filter to be set on the source sheet! Please set a filter before trying again'
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

  // below code is the actual categorization logic
  // all the code before is just visually for the user
  let rowsCategorized = 0;
  const data = sourceSheet?.getDataRange()?.getValues() ?? [];

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

  if (rowsCategorized === 0) {
    ui.alert('No rows were categorized!');
    return;
  }

  ui.alert(`Succesfully categorized ${rowsCategorized} rows!`);
};

export const mailNetWorth = () => {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const locale = spreadsheet.getSpreadsheetLocale().replace('_', '-');
  const userEmail = spreadsheet.getOwner().getEmail();
  const netWorth = Number(
    spreadsheet.getRangeByName(NAMED_RANGES.netWorth).getValue()
  );
  const currentMonth = new Date().toLocaleString(locale, { month: 'long' });

  const formattedNetWorth = netWorth.toLocaleString(locale, {
    style: 'currency',
    currency: 'EUR',
  });

  if (userEmail && netWorth) {
    MailApp.sendEmail({
      to: userEmail,
      subject: `Your Net Worth (Monthly Update: ${currentMonth})`,
      htmlBody: `Your net worth is currently: <strong>${formattedNetWorth}</strong>`,
    });
  }
};

export const executeFindDuplicates = () => {
  const ui = SpreadsheetApp.getUi()
  const response = ui.prompt(
    `How many days should be considered for duplicates?`,
    `Please enter a full number of days (e.g. 7)`,
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() !== ui.Button.OK) {
    return;
  }

  const duplicateThresholdInDays = Number(response.getResponseText());
  const duplicateThresholdMs = duplicateThresholdInDays * 24 * 60 * 60 * 1000;

  if (isNaN(duplicateThresholdInDays)) {
    ui.alert('Invalid input! Please enter a valid number of days (e.g. 7)');
    return;
  }

  const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = spreadSheet.getSheetByName('source');
  const table = sourceSheet.getDataRange().getValues();
  const headers = table[0];

  const duplicateRows = findDuplicates(table, ['iban', 'amount', 'contra_account', 'description'], duplicateThresholdMs);

  if (duplicateRows.length === 0) {
    SpreadsheetApp.getUi().alert('No duplicates found!');
    return;
  }

  const duplicateSheet =
    spreadSheet.getSheetByName('duplicate-rows') ??
    spreadSheet.insertSheet('duplicate-rows');

  duplicateSheet.clear(); // Clear any existing content

  // Copy headers
  duplicateSheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Copy duplicate rows
  duplicateRows.forEach((row, i) => {
    duplicateSheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
  });

  SpreadsheetApp.getUi().alert(
    `Found ${duplicateRows.length / 2} duplicates! Rows have been copied to the "duplicate-rows" sheet`
  );
}
