/**
 * The import strategies, basically a list of different bank accounts the user has defined
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
export type StrategyOptions = Record<string, string>;

/**
 * Table definition
 * tables by default should define rows
 * e.g.
 * ```
 * [
 *    ['column1row1', 'column2row1'], // <-- row 1
 *    ['column1row2', 'column2row2'], // <-- row 2
 * ]
 * ```
 */
export type Table = string[][];

/**
 * Table definition in JSON format
 * A JSON table has the following structure
 * ```json
 * [{
 *    "column1": "col1row1",
 *    "column2": "col2row1"
 * }, {
 *    "column1": "col1row2",
 *    "column2": "col2row2"
 * }]
 * ```
 */
export type JsonTable = Record<string, string>[];

export type ServerResponse = {
  message: string;
};

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
  ref: string;
  iban: string;
  date: string;
  amount: number;
  balance: number | '';
  contra_account: string;
  description: string | '';
  comments: string | '';
  icon: string | '';
  category: string | '';
  label: string | '';
  import_date: string;
  hours: number | '';
  disabled: boolean | '';
  contra_iban: string;
  currency: string;
};
