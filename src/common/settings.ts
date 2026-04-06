import type { DialogType, FireColumn } from "./constants"

export const DIALOG_SIZES: Record<keyof typeof DialogType, [number, number]> = {
  import: [900, 600],
  settings: [900, 600],
  about: [300, 200],
};

export const FEATURES: Record<string, boolean> = {
  IMPORT_DUPLICATE_DETECTION: false,
}

export const DUPLICATE_COMPARE_COLS: FireColumn[] = ['date', 'iban', 'amount', 'contra_account', 'description']

