export enum n26Cols {
  Date,
  Payee,
  AccountNumber,
  TransactionType,
  PaymentReference,
  Amount,
  AmountForeignCurrency,
  ForeignCurrencyType,
  ExchangeRate,
}

export enum raboCols {
  Iban,
  Munt,
  BIC,
  Volgnr,
  Datum,
  RenteDatum,
  Bedrag,
  Saldo,
  Tegenrekening,
  NaamTegenpartij,
  NaamUiteindelijkePartij,
  NaamInitierendePartij,
  BICTegenpartij,
  Code,
  BatchID,
  TransactieReferentie,
  MachtigingsKenmerk,
  IncassantID,
  BetalingsKenmerk,
  Omschrijving1,
  Omschrijving2,
  Omschrijving3,
}

export enum bbvaCols {
  Date,
  EffectiveDate,
  SubjectLine,
  Movement,
  Amount,
  Currency,
  Available, // <-- balance
  CurrencyOfAvailable,
  Comments,
}

export enum openbankCols {
  Fecha,
  FechaValor,
  Concepto,
  Importe,
  Saldo,
}

export type InputColumn = n26Cols | raboCols | bbvaCols | openbankCols;

export enum StrategyOption {
  N26 = 'n26',
  RABO = 'rabobank',
  BBVA = 'bbva',
  OPENBANK = 'openbank',
}

export type Table = string[][];

/**
 * A column function returns the values for that column
 * it can generate the column based on the data in the CSV
 */
export type ColumnRule<T> = ((data: Table) => T[]) | null;

export interface FireColumnRules {
  ref: ColumnRule<string | number>;
  iban: ColumnRule<string>;
  date: ColumnRule<Date>;
  amount: ColumnRule<number>;
  contra_account?: ColumnRule<string>;
  description?: ColumnRule<string>;
  category: ColumnRule<string | null>;
  label?: ColumnRule<string>;
  import_date: ColumnRule<Date>;
  contra_iban: ColumnRule<string>;
  currency?: ColumnRule<string>;
}

export type Strategy = {
  beforeImport?: Array<(data: Table) => Table>;
  columnImportRules: FireColumnRules;
  afterImport?: Array<(data: Table) => void>;
  autoFillColumns?: number[];
};

export type ServerResponse = {
  message: string;
};
