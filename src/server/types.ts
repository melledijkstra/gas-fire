/**
 * A column function returns the values for that column
 * it can generate the column based on the data in the CSV
 */
type ColumnRule<T> = (() => T[]) | null;

export interface FireColumnRules {
  ref: ColumnRule<string | number>;
  iban: ColumnRule<string>;
  date: ColumnRule<Date | string>;
  amount: ColumnRule<number>;
  contra_account?: ColumnRule<string>;
  description?: ColumnRule<string>;
  category: ColumnRule<string | null>;
  label?: ColumnRule<string>;
  import_date: ColumnRule<Date>;
  contra_iban: ColumnRule<string>;
  currency?: ColumnRule<string>;
}
