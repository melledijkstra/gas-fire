import { getSourceSheet } from '../globals';
import { Config } from '../config';
import { findDuplicates } from '../duplicate-finder';
import { NAMED_RANGES } from '../../common/constants';

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
