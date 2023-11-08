import { BankAccount } from './accounts';
import { buildColumn } from './table-utils';
import { Transformers } from './transformers';
import type { Strategy, StrategyOption, Table } from '../types';
import { bbvaCols, n26Cols, raboCols, openbankCols } from '../types';
import { Utils } from './utils';

export const AUTO_FILL_COLUMNS = [
  5, // balance column
  9, // category icon
  13, // hours column
  14, // disabled column
];

const defaultAfterImport = [
  (table: Table) => Utils.autoFillColumns(table, AUTO_FILL_COLUMNS),
];

type RootConfig = {
  [key in StrategyOption]: Strategy;
};

export class Config {
  static getConfig(): RootConfig {
    return {
      n26: {
        beforeImport: [
          Utils.deleteLastRow,
          Utils.deleteFirstRow,
          Utils.sortByDate(n26Cols.Date),
        ],
        columnImportRules: {
          ref: null,
          iban: (data) => new Array(data.length).fill(BankAccount.N26),
          date: buildColumn(n26Cols.Date, (val) => new Date(val)),
          amount: buildColumn(n26Cols.Amount, parseFloat),
          category: buildColumn(n26Cols.Payee, Transformers.transformCategory),
          contra_account: buildColumn(n26Cols.Payee, String),
          label: buildColumn(n26Cols.TransactionType, String),
          import_date: (data) => new Array(data.length).fill(new Date()),
          description: buildColumn(n26Cols.PaymentReference, String),
          contra_iban: buildColumn(n26Cols.AccountNumber, String),
          currency: buildColumn(n26Cols.ForeignCurrencyType, String),
        },
        afterImport: defaultAfterImport,
      },
      rabobank: {
        beforeImport: [
          Utils.deleteLastRow,
          Utils.deleteFirstRow,
          Utils.sortByDate(raboCols.Datum),
        ],
        columnImportRules: {
          ref: buildColumn(raboCols.Volgnr, parseInt),
          iban: buildColumn(raboCols.Iban, String),
          date: buildColumn(raboCols.Datum, (val) => new Date(val)),
          amount: buildColumn(raboCols.Bedrag, Transformers.transformMoney),
          category: null,
          contra_account: buildColumn(raboCols.NaamTegenpartij, String),
          import_date: (data) => new Array(data.length).fill(new Date()),
          contra_iban: buildColumn(raboCols.Tegenrekening, String),
          currency: buildColumn(raboCols.Munt, String),
          description: buildColumn(raboCols.Omschrijving1, String),
          label: buildColumn(raboCols.Omschrijving2, String),
        },
        afterImport: defaultAfterImport,
      },
      bbva: {
        beforeImport: [
          Utils.deleteLastRow,
          Utils.deleteFirstRow,
          Utils.sortByDate(bbvaCols.Date),
        ],
        columnImportRules: {
          ref: null,
          iban: (data) => new Array(data.length).fill(BankAccount.BBVA),
          date: buildColumn(bbvaCols.Date, (val) =>
            Transformers.transformDate(val)
          ),
          amount: buildColumn(bbvaCols.Amount, Transformers.transformMoney),
          category: null,
          import_date: (data) => new Array(data.length).fill(new Date()),
          contra_iban: null,
          currency: buildColumn(bbvaCols.Currency, String),
          description: buildColumn(bbvaCols.Comments, String),
          label: buildColumn(bbvaCols.SubjectLine, String),
        },
        afterImport: defaultAfterImport,
      },
      openbank: {
        beforeImport: [
          Utils.deleteFirstRow,
          Utils.deleteLastRow,
          // open bank has some empty columns when importing
          (table) => Utils.deleteColumns(table, [0, 2, 4, 6, 8]),
        ],
        columnImportRules: {
          ref: null,
          iban: (data) => new Array(data.length).fill(BankAccount.OPENBANK),
          date: buildColumn(openbankCols.Fecha, (val) => {
            let [day, month, year] = val.split('/');
            let yearNum = +year;
            if (year && year.length === 2) {
              // if year is of length 2 it means it only provides the year since 2000
              // to fix we add 2000
              yearNum = +year + 2000;
            }
            return new Date(+yearNum, +month - 1, +day);
          }),
          amount: buildColumn(
            openbankCols.Importe,
            Transformers.transformMoney
          ),
          category: null,
          contra_account: null,
          label: null,
          description: buildColumn(openbankCols.Concepto, String),
          import_date: (data) => new Array(data.length).fill(new Date()),
          contra_iban: null,
          currency: null,
        },
        afterImport: defaultAfterImport,
      },
    };
  }
}
