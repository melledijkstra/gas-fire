/**
 * The import bank options, basically a list of different bank accounts the user has defined
 * e.g.
 * ```
 * {
 *    bank_of_america: 'Bank of America',
 *    commerzbank: 'Commerzbank',
 *    ing: 'ING',
 *    revolut: 'Revolut'
 * }
 * ```
 */
export type BankOptions = Record<string, string>;

/**
 * Raw table definition for client-server data transfer.
 * Tables by default should define rows and only contain string values.
 * On the server side, use the `Table` or `FireTable` classes instead
 * for richer data manipulation.
 * e.g.
 * ```
 * [
 *    ['column1row1', 'column2row1'], // <-- row 1
 *    ['column1row2', 'column2row2'], // <-- row 2
 * ]
 * ```
 */
export type RawTable = string[][];

export type TransactionStatus = 'valid' | 'duplicate' | 'removed';
export type TransactionAction = 'skip' | 'import';

export interface PreviewTransaction {
  hash: string;
  row: string[];
  status: TransactionStatus;
  statusReason?: string;
  action: TransactionAction;
}

export interface ImportPreviewReport {
  transactions: PreviewTransaction[];
  newBalance?: number;
  summary: {
    totalRows: number;
    validCount: number;
    removedCount: number;
    duplicateCount: number;
    rulesApplied: number;
  };
}

export type UserDecisions = Record<string, TransactionAction>;

type EmptyServerResponse = { success: true; message?: string };
type ErrorServerResponse = { success: false; error: string; };
type PayloadServerResponse<T> = { success: true; data: T; message?: string };

export type ServerResponse<T = void> =
  | (T extends void ? EmptyServerResponse : PayloadServerResponse<T>)
  | ErrorServerResponse;

/**
 * Account definition
 * ```
 * {
 *   'Bank of America': 'US1234567890',
 *   'Commerzbank': 'DE89370400440532013000',
 *   'ING': 'NL01INGB1234567890',
 * }
 */
export type Accounts = {
  [key: string]: string;
};

export type FireTransaction = {
  // an ID for the transaction, can be anything as long as it is unique
  ref: string;
  // the IBAN of this transaction, either receiving or executing the payment
  // this is used to link it to an bank account
  iban: string;
  // the date of the transaction in format: 11/09/2024 (DD/MM/YYYY)
  date: string;
  amount: number;
  balance: number | '';
  contra_account: string;
  description: string;
  comments: string;
  icon: string;
  category: string;
  label: string;
  import_date: string;
  hours: number | '';
  disabled: boolean | '';
  contra_iban: string;
  currency: string;
};
