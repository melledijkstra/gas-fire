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
