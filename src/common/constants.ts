export enum DialogType {
  import,
  settings,
  about,
  enableBanking,
}

export enum NAMED_RANGES {
  netWorth = 'netWorth',
  accounts = 'accounts',
  debug = 'DEBUG',
}

/**
 * The columns that represent the YMYL sheet
 * Make sure to keep this in sync with the columns in the YMYL sheet
 * The order of the columns is important because the indexes are used in calculations!
 */
export const YMYL_COLUMNS = [
  'ref',
  'iban',
  'date',
  'amount',
  'balance',
  'contra_account',
  'description',
  'comments',
  'icon',
  'category',
  'label',
  'import_date',
  'hours',
  'disabled',
  'contra_iban',
  'currency',
] as const

export type YMYLColumn = (typeof YMYL_COLUMNS)[number]

/** @deprecated Use YMYL_COLUMNS */
export const FIRE_COLUMNS = YMYL_COLUMNS
/** @deprecated Use YMYLColumn */
export type FireColumn = YMYLColumn

export const SOURCE_SHEET_ID = 1093484485

export const IMPORT_RULES_SHEET_NAME = 'import-rules'
