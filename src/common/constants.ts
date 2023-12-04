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
