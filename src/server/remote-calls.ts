import { FireSpreadsheet, getSourceSheet } from './globals';
import { Config } from './config';
import { TableUtils, processInputDataAndShapeFiresheetStructure } from './table-utils';
import type { StrategyOptions, ServerResponse, Table } from '@/common/types';
import { AccountUtils, isNumeric } from './account-utils';
import { Transformers } from './transformers';
import {
  getCategoryNames,
  slugify,
  structuredClone
} from './helpers';
import { detectCategoryByTextAnalysis } from './category-detection';
import { findDuplicates } from './duplicate-finder';
import { NAMED_RANGES } from '../common/constants';
import { Logger } from '@/common/logger';
import { activateSpreadsheet, removeFilterCriteria } from './utils/spreadsheet';
import { cleanString } from './utils';

/**
 * This retrieves the bank accounts set by the user.
 * It uses 2 named ranges to combine them together as a usable object
 *
 * example:
 * ```
 * {
 *   "Bank of America": "US1234567890",
 *   "Revolut": "GB1234567890"
 * }
 * ```
 *
 * @returns An object where the key is the label of the bank and the value the IBAN
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

  for (const [index, iban] of ibans?.entries() ?? []) {
    const label = cleanString(accountNames?.[index]);
    const cleanIban = cleanString(iban);

    if (cleanIban) {
      // this sets the label as the key and the iban as the value
      bankAccounts[label] = cleanIban;
    }
  }

  return bankAccounts;
}

/**
 * This very function might be the core of this spreadsheet and project.
 * It handles incoming CSV (already parsed by the frontend) and processes it in order to be imported
 * into the spreadsheet.
 *
 * It uses configuration from the user to determine how the CSV should be processed.
 *
 * @param {Table} inputTable - The table object which contains the CSV data
 * @param {string} bankAccount - The bank account identifier which is used to lookup configuration
 * @returns {ServerResponse} A response object which contains a message to be displayed to the user
 */
export function importCSV(
  inputTable: Table,
  bankAccount: string
): ServerResponse {
  Logger.time('importCSV')

  const sourceSheet = getSourceSheet()
  const accountConfig = Config.getAccountConfiguration(bankAccount)

  Logger.log('account configuration used for import', accountConfig)

  if (!accountConfig) {
    throw new Error(
      `Bank with identifier "${bankAccount}" does not have valid configuration!`
    )
  }

  // make the user visually switch to the primary sheet where data will be imported
  activateSpreadsheet(sourceSheet)

  // remove any filters that might be set
  // importing might go wrong when filters are set
  const filter = sourceSheet?.getFilter()

  if (filter) {
    if (!removeFilterCriteria(filter, true)) {
      throw new Error(
        'Filters need to be removed before importing, cancelling import'
      );
    }
  }

  let result = structuredClone(inputTable)

  // retrieve the header row and separate from the actual input data
  const headerRow = result.shift() // cast because we know first header row exists

  if (!headerRow || headerRow.length === 0) {
    const msg = 'No header row detected in import data!'
    Logger.log(msg)
    return { message: msg }
  }

  //
  // BEFORE IMPORT RULES
  //
  result = TableUtils.removeEmptyRows(result)

  //
  // IMPORT RULES
  //
  result = processInputDataAndShapeFiresheetStructure({
    headers: headerRow,
    rows: result,
    config: accountConfig,
  })
  // ^^ result is now in the firesheet structure

  const dateColumn = TableUtils.getFireColumnIndexByName('date')
  if (dateColumn) {
    // if we found a date column, we sort the data by date
    result = TableUtils.sortByDate(result, dateColumn)
  }

  if (result.length === 0) {
    const msg = 'No rows to import, check your import data or configuration!';
    Logger.log(msg)
    return {
      message: msg,
    }
  }

  // actual importing of the data into the sheet
  Logger.time('TableUtils.importData')
  TableUtils.importData(result)
  Logger.timeEnd('TableUtils.importData')

  const msg = `imported ${result.length} rows!`;
  Logger.log(msg)

  //
  // AFTER IMPORT RULES
  //
  // the after import rules are not able to manipulate the data
  // therefore the data is only given as reference for any needed calculations
  // apply any rules that need to be applied after the actual import
  // e.g. auto filling columns with formulas
  if (accountConfig.autoFillEnabled) {
    Logger.time('TableUtils.autoFillColumns')
    TableUtils.autoFillColumns(result, accountConfig.autoFillColumnIndices)
    Logger.timeEnd('TableUtils.autoFillColumns')
  }

  Logger.timeEnd('importCSV')

  return {
    message: msg,
  };
}

export function generatePreview(
  table: Table,
  bankAccount: string
): {
  result: Table;
  newBalance?: number;
} {
  let amounts: Array<string> = [];

  // PENDING: retrieve the amounts from CSV using the back account configuration
  const config = Config.getAccountConfiguration(bankAccount);

  if (!config) {
    throw new Error(`Configuration for account ${bankAccount} not found`);
  }

  const balanceColumnName = config?.getImportColumnNameByFireColumn('amount');

  if (balanceColumnName) {
    const balanceColumnIndex = table[0].indexOf(balanceColumnName);
    if (balanceColumnIndex !== -1) {
      amounts = table.map((row) => row[balanceColumnIndex]);
    }
  }

  const amountNumbers = amounts
    .map((value) => Transformers.transformMoney(value))
    .filter(isNumeric);

  const newBalance = AccountUtils.calculateNewBalance(bankAccount, amountNumbers);

  return { result: table, newBalance };
}

/**
 * This function returns the available bank account options to the client side
 */
export function getBankAccountOptions(): StrategyOptions {
  const accountNames = FireSpreadsheet.getRangeByName(NAMED_RANGES.accountNames);

  if (!accountNames) {
    return {}
  }

  const accounts = accountNames
    .getValues()
    // make sure not to include empty rows
    .filter((row) => row.some((cell) => cell !== '' && cell !== null))
    // flatten out the array so it is 1 dimensional with account names
    .flat();

  // we convert the account names to slugs and return them as an object
  const result = accounts.reduce<Record<string, string>>((obj: Record<string, string>, account: string) => {
    const slug = slugify(account);
    obj[slug] = account;
    return obj;
  }, {});

  return result;
}

export function getBankAccountOptionsCached(): Record<string, string> {
  const cache = CacheService.getDocumentCache();
  const accountsCached = cache.get('accounts');

  if (accountsCached) {
    return JSON.parse(accountsCached);
  }

  const accounts = getBankAccountOptions();
  cache.put('accounts', JSON.stringify(accounts), 600);

  return accounts;
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
  const contraAccountIndex = TableUtils.getFireColumnIndexByName('contra_account');
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

  const netWorthRange = spreadsheet.getRangeByName(NAMED_RANGES.netWorth)

  if (!netWorthRange) {
    console.error('No net worth named range found, can\'t send email!')
    return
  }

  const netWorth = Number(netWorthRange.getValue());
  const currentMonth = new Date().toLocaleString(locale, { month: 'long' });

  const formattedNetWorth = netWorth.toLocaleString(locale, {
    style: 'currency',
    currency: 'EUR',
  });

  if (userEmail && !isNaN(netWorth)) {
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

  if (Number.isNaN(duplicateThresholdInDays)) {
    ui.alert('Invalid input! Please enter a valid number of days (e.g. 7)');
    return;
  }

  const spreadSheet = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = getSourceSheet();

  if (!sourceSheet) {
    throw new Error('Could not retrieve the source sheet from the spreadsheet')
  }

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
  for (const [i, row] of duplicateRows.entries()) {
    duplicateSheet.getRange(i + 2, 1, 1, row.length).setValues([row]);
  }

  SpreadsheetApp.getUi().alert(
    `Found ${duplicateRows.length / 2} duplicates! Rows have been copied to the "duplicate-rows" sheet`
  );
}

export const debugImportSettings = () => {
  const accountConfigs = Config.getConfigurations()

  const ui = SpreadsheetApp.getUi()

  const configKeys = Object.keys(accountConfigs)

  ui.alert(`Found ${configKeys.length} account configurations!\n\n${configKeys.join('\n')}\n\nSee logs for more details`)

  console.log(accountConfigs);
}
