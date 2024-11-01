export enum DialogType {
  import,
  settings,
  about,
}

export const DIALOG_SIZES: Record<keyof typeof DialogType, [number, number]> = {
  import: [900, 600],
  settings: [900, 600],
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

export type FireColumn = (typeof FIRE_COLUMNS)[number];

export const SOURCE_SHEET_ID = 1093484485;

export const PROP_BANK_ACCOUNTS = 'BANK_ACCOUNTS';
export const PROP_AUTOMATIC_CATEGORIES_CONFIG =
  'AUTOMATIC_CATEGORIZATION_CONFIG';
