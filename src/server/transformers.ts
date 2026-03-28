import { detectCategoryByTextAnalysis } from './category-detection/detection';
import { getSpreadsheetLocale } from './utils/spreadsheet';
import { Logger } from '@/common/logger';

const getDateParts = (parts: number[], locale?: string): { year: number, month: number, day: number } => {
  const [part1, part2, part3] = parts;
  return {
    year: part3,
    month: locale === 'en_US' ? part1 : part2,
    day: locale === 'en_US' ? part2 : part1
  };
}

// List of possible formats and their corresponding parsers.
// Add or modify formats as needed.
const DATE_FORMATS = [
  {
    // ISO format: "yyyy-MM-dd"
    regex: /^\d{4}-\d{2}-\d{2}$/,
    parser: (str: string) => {
      const parts = str.split("-").map(Number)
      return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    }
  },
  {
    // Format with dots
    // "yyyy.MM.dd"
    regex: /^\d{4}\.\d{2}\.\d{2}$/,
    parser: (str: string) => {
      const parts = str.split(".").map(Number);
      return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    }
  },
  {
    // US format: "MM/dd/yyyy"
    // European format: "dd/MM/yyyy"
    regex: /^\d{2}\/\d{2}\/\d{4}$/,
    parser: (str: string, locale?: string) => {
      const parts = str.split("/").map(Number)
      const { year, month, day } = getDateParts(parts, locale);
      return new Date(Date.UTC(year, month - 1, day));
    }
  },
  {
    // Format with dots
    // EU: "dd.MM.yyyy"
    // US: "MM.dd.yyyy"
    regex: /^\d{2}\.\d{2}\.\d{4}$/,
    parser: (str: string, locale?: string) => {
      const parts = str.split(".").map(Number);
      const { year, month, day } = getDateParts(parts, locale);
      return new Date(Date.UTC(year, month - 1, day));
    }
  },
  {
    // Format with 2 digit year
    // EU: "dd/MM/yy"
    // US: "MM/dd/yy"
    regex: /^\d{1,2}\/\d{1,2}\/\d{2}$/,
    parser: (str: string, locale?: string) => {
      const parts = str.split("/").map(Number);
      // Handle two-digit year
      const currentYear = new Date().getFullYear()
      let year = parts[2] + Math.floor(currentYear / 100) * 100;
      // If the resulting year is more than 20 years in the future,  
      // assume it belongs to the previous century.  
      if (year > currentYear + 20) {
        year -= 100;
      }

      // Use locale to determine month/day order.
      const month = locale === 'en_US' ? parts[0] : parts[1];  
      const day = locale === 'en_US' ? parts[1] : parts[0];
      return new Date(Date.UTC(year, month - 1, day));
    }
  }
];

export class Transformers {
  static transformMoney(value: string | number): number {
    // If already a number, return it directly
    if (typeof value === 'number') return value;
    // If not a number neither a string, then we can't return a valid number
    if (typeof value !== 'string') return NaN;

    if (!value.trim()) return 0;

    // Remove currency symbols and irrelevant characters
    // Keeping digits, minus sign, and potential separators (., ' and space)
    let cleanedStr = value.replace(/[^\d.,'\s-]/g, '').trim();

    // If the string is empty after cleaning, it means it had no valid characters, return 0.
    if (!cleanedStr) return 0;

    // If there are no digits but there is a minus sign, return NaN, else 0
    if (!/\d/.test(cleanedStr)) {
      return cleanedStr.includes('-') ? NaN : 0;
    }

    // Detect decimal separator
    const lastComma = cleanedStr.lastIndexOf(',');
    const lastDot = cleanedStr.lastIndexOf('.');
    let decimalSeparator = '';

    // Detect decimal separator by finding the last occurrence of comma or dot.
    // This allows for correct parsing of numbers containing both, e.g. "1.234,56" or "1,234.56"
    if (lastComma > lastDot) {
      decimalSeparator = ',';
    } else if (lastDot > lastComma) {
      decimalSeparator = '.';
    } else {
      // If neither comma nor dot found, or they are at the same position (-1)
      try {
        const locale = getSpreadsheetLocale() || 'en_US';
        const normalizedLocale = locale.replace('_', '-');
        const parts = new Intl.NumberFormat(normalizedLocale).formatToParts(1234.5);
        const localeDecimal = parts.find(p => p.type === 'decimal')?.value;

        if (localeDecimal && cleanedStr.includes(localeDecimal)) {
          decimalSeparator = localeDecimal;
        }
      } catch {
        // Ignore Intl.NumberFormat errors if any
      }
    }

    if (decimalSeparator) {
      // Identify thousand separator characters (anything other than digits, minus sign, and decimal separator)
      const escapedDecSepChar = decimalSeparator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const groupCharsRegex = new RegExp(`[^\\d${escapedDecSepChar}-]`, 'g');

      // Remove thousand separators
      cleanedStr = cleanedStr.replace(groupCharsRegex, '');

      // Replace the first occurrence of the decimal separator with a dot
      cleanedStr = cleanedStr.replace(decimalSeparator, '.');
    } else {
      // No decimal separator found; remove all non-digit, non-minus chars
      cleanedStr = cleanedStr.replace(/[^\d-]/g, '');
    }

    // Convert to number
    const number = Number(cleanedStr);

    return number;
  }

  static transformDate(value: string): Date {
    const locale = getSpreadsheetLocale();

    // Try each format.
    for (const format of DATE_FORMATS) {
      if (!format.regex.test(value)) {
        continue;
      }

      const date = format.parser(value, locale);
      if (date instanceof Date && !Number.isNaN(date.getTime())) {
        return date;
      }
    }

    // Log a warning and throw an Error to prevent silent data corruption
    Logger.warn(`Failed to parse date: "${value}" with locale: "${locale}"`);
    throw new Error(`Failed to parse date: "${value}"`);
  }

  static transformCategory(value: string): string | null {
    return detectCategoryByTextAnalysis(value) ?? null;
  }
}
