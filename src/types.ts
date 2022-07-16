enum n26Cols {
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

enum raboCols {
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

enum bbvaCols {
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

enum openbankCols {
  Fecha,
  FechaValor,
  Concepto,
  Importe,
  Saldo,
}

type InputColumn = n26Cols | raboCols | bbvaCols | openbankCols;

enum StrategyOption {
  N26 = 'n26',
  RABO = 'rabobank',
  BBVA = 'bbva',
  OPENBANK = 'openbank',
}

type Table = string[][];

/**
 * A column function returns the values for that column
 * it can generate the column based on the data in the CSV
 */
type ColumnRule<T> = (data: Table) => T[];

interface FireColumnRules {
  ref: ColumnRule<number>;
  iban: ColumnRule<string>;
  date: ColumnRule<Date>;
  amount: ColumnRule<number>;
  contra_account?: ColumnRule<string>;
  description?: ColumnRule<string>;
  satisfaction?: ColumnRule<number>;
  category: ColumnRule<string>;
  label?: ColumnRule<string>;
  contra_iban: ColumnRule<string>;
  currency?: ColumnRule<string>;
}

type Strategy = {
  [key in StrategyOption]: {
    beforeImport?: Array<(data: Table) => Table>;
    columnImportRules: FireColumnRules;
    afterImport?: Array<(data: Table) => void>;
    autoFillColumns?: number[];
  };
};

type ServerResponse = {
  message: string;
};
