import { detectCategoryByTextAnalysis } from './category-detection';

export class Transformers {
  static transformMoney(value: string): number {
    if (typeof value !== 'string') return NaN;

    // Remove currency symbols and irrelevant characters
    let cleanedStr = value.replace(/[^0-9.,'-]/g, '');
    // Remove apostrophes used as thousand separators
    cleanedStr = cleanedStr.replace(/'/g, '');
    // Detect decimal separator
    let lastComma = cleanedStr.lastIndexOf(',');
    let lastDot = cleanedStr.lastIndexOf('.');
    let decimalSeparator = '';

    if (lastComma > lastDot) {
      decimalSeparator = ',';
    } else if (lastDot > lastComma) {
      decimalSeparator = '.';
    }

    if (decimalSeparator) {
      // Identify thousand separator
      let thousandSeparator = decimalSeparator === '.' ? ',' : '.';
      // Remove thousand separators
      cleanedStr = cleanedStr.split(thousandSeparator).join('');
      // Replace decimal separator with a dot
      cleanedStr = cleanedStr.replace(decimalSeparator, '.');
    } else {
      // No decimal separator found; remove all commas and dots
      cleanedStr = cleanedStr.replace(/[.,]/g, '');
    }

    // Convert to number
    let number = Number(cleanedStr);

    return number;
  }

  static transformDate(value: string): Date {
    return new Date(new Date(value).toDateString());
  }

  static transformCategory(value: string): string | null {
    return detectCategoryByTextAnalysis(value) ?? null;
  }
}
