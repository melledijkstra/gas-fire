import type { Table } from '@/common/types';

export enum N26Cols {
  BookingDate,
  ValueDate,
  Payee,
  AccountNumber,
  TransactionType,
  PaymentReference,
  AccountName,
  Amount,
  OriginalAmount,
  OriginalCurrency,
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

export enum openbankCols {
  Fecha,
  FechaValor,
  Concepto,
  Importe,
  Saldo,
}

/**
 * A column function returns the values for that column
 * it can generate the column based on the data in the CSV
 */
type ColumnRule<T> = ((data: Table) => T[]) | null;

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
