export enum DialogType {
  import,
  configValidator,
  about,
}

export enum NAMED_RANGES {
  netWorth = 'netWorth',
  accounts = 'accounts',
  accountNames = 'accountNames',
}

export const DIALOG_SIZES: Record<keyof typeof DialogType, [number, number]> = {
  import: [900, 600],
  configValidator: [900, 600],
  about: [300, 200],
};

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
] as const;

export const DEFAULT_CACHE_SECOND = 20;

export const SOURCE_SHEET_ID = 1093484485;

export const PROP_AUTOMATIC_CATEGORIES_CONFIG =
  'AUTOMATIC_CATEGORIZATION_CONFIG';
