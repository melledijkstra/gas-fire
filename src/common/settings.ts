import type { FireColumn } from "./constants"

export const DIALOG_SIZES: Record<'import' | 'settings' | 'about', [number, number]> = {
  import: [900, 600],
  settings: [900, 600],
  about: [300, 200],
};

export const FEATURES: Record<string, boolean> = {
  IMPORT_DUPLICATE_DETECTION: false,
}

// ORDER IS IMPORTANT!
export const HASH_COLUMNS: FireColumn[] = ['iban', 'date', 'amount', 'contra_account', 'description']
