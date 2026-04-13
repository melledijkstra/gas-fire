import type { DialogType, FireColumn } from './constants'

export const DIALOG_SIZES: Record<keyof typeof DialogType, [number, number]> = {
  import: [900, 600],
  settings: [900, 600],
  about: [300, 200],
}

export const FEATURES: Record<string, boolean> = {
  IMPORT_DUPLICATE_DETECTION: false,
} as const

// These are the columns that are used to calculate the hash of a FireTable row
// ORDER IS IMPORTANT!
export const HASH_COLUMNS: FireColumn[] = ['iban', 'date', 'amount', 'contra_account', 'description']
