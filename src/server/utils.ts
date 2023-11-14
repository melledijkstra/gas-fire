import { FireSpreadsheet, sheets } from './globals';

export function getSheetById(
  id: number
): GoogleAppsScript.Spreadsheet.Sheet | undefined {
  return sheets.find((sheet) => sheet.getSheetId() === id);
}

export class Utils {
  static getBankAccounts(): Record<string, string> {
    // this range contains the ibans only
    const ibans = FireSpreadsheet.getRangeByName('accounts');
    // we also need to include the labels
    const accounts = ibans
      ?.offset(0, -1, ibans.getLastRow(), 2)
      .getValues()
      // make sure not to include empty rows
      .filter((row) => row.some((cell) => cell !== '' && cell !== null));

    if (!accounts?.length) {
      return {}; // return empty list of bank accounts if none setup
    }

    // convert the list to an object to easy work with it
    return accounts.reduce((obj, account) => {
      const [id, iban] = account;
      obj[id.toUpperCase()] = iban;
      return obj;
    }, {});
  }

  static getBankIban(bank: string): string {
    const bankAccounts = Utils.getBankAccounts();
    return bankAccounts?.[bank] ?? '';
  }
}
