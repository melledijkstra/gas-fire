import { TableUtils, buildColumn } from './table-utils';
import { Transformers } from './transformers';
import type { StrategyOption, Table } from '../common/types';
import type { Strategy } from './types';
import { n26Cols, raboCols, openbankCols } from './types';
import { AccountUtils } from './account-utils';

export const AUTO_FILL_COLUMNS = [
  1, // ref column
  5, // balance column
  9, // category icon
  13, // hours column
  14, // disabled column
];

const defaultAfterImport = [
  (table: Table) => TableUtils.autoFillColumns(table, AUTO_FILL_COLUMNS),
];

type RootConfig = {
  [key in StrategyOption]: Strategy;
};

const n26Config: Strategy = {
  decimalSeparator: '.',
  beforeImport: [
    TableUtils.deleteLastRow,
    TableUtils.deleteFirstRow,
    TableUtils.sortByDate(n26Cols.BookingDate),
  ],
  columnImportRules: {
    ref: null,
    iban: (data) =>
      new Array(data.length).fill(AccountUtils.getBankIban('N26')),
    date: buildColumn(n26Cols.BookingDate, (val) => new Date(val)),
    amount: buildColumn(n26Cols.Amount, parseFloat),
    category: buildColumn(n26Cols.Payee, Transformers.transformCategory),
    contra_account: buildColumn(n26Cols.Payee, String),
    label: buildColumn(n26Cols.TransactionType, String),
    import_date: (data) => new Array(data.length).fill(new Date()),
    description: buildColumn(n26Cols.PaymentReference, String),
    contra_iban: buildColumn(n26Cols.AccountNumber, String),
    currency: buildColumn(n26Cols.OriginalCurrency, String),
  },
  afterImport: defaultAfterImport,
};

const rabobankConfig: Strategy = {
  decimalSeparator: ',',
  beforeImport: [
    TableUtils.deleteLastRow,
    TableUtils.deleteFirstRow,
    TableUtils.sortByDate(raboCols.Datum),
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
};

const openbankConfig: Strategy = {
  decimalSeparator: '.',
  beforeImport: [
    TableUtils.deleteFirstRow,
    TableUtils.deleteLastRow,
    // open bank has some empty columns when importing
    (table) => TableUtils.deleteColumns(table, [0, 2, 4, 6, 8]),
  ],
  columnImportRules: {
    ref: null,
    iban: (data) =>
      new Array(data.length).fill(AccountUtils.getBankIban('OPENBANK')),
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
    amount: buildColumn(openbankCols.Importe, Transformers.transformMoney),
    category: null,
    contra_account: null,
    label: null,
    description: buildColumn(openbankCols.Concepto, String),
    import_date: (data) => new Array(data.length).fill(new Date()),
    contra_iban: null,
    currency: null,
  },
  afterImport: defaultAfterImport,
};

export class Config {
  static cache: RootConfig | null = null;

  static getConfig(): RootConfig {
    if (this.cache) {
      return this.cache;
    }

    const rootConfig = {
      n26: n26Config,
      rabobank: rabobankConfig,
      openbank: openbankConfig,
    };
    this.cache = rootConfig;
    return rootConfig;
  }
}
