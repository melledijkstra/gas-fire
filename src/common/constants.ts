export enum DialogType {
  import,
  settings,
  about,
}

export enum NAMED_RANGES {
  netWorth = 'netWorth',
  accounts = 'accounts',
  accountNames = 'accountNames',
  debug = 'DEBUG',
}

/**
 * The columns that represent the FIRE sheet
 * Make sure to keep this in sync with the columns in the FIRE sheet
 * The order of the columns is important because the indexes are used in calculations!
 */
export const FIRE_COLUMNS = [
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

export type FireColumn = (typeof FIRE_COLUMNS)[number]

export const SOURCE_SHEET_NAME = 'source'
