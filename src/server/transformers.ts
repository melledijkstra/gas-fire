import { detectCategoryByTextAnalysis } from './category-detection';
import { getSpreadsheetLocale } from './utils/spreadsheet';

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

    // Remove currency symbols and irrelevant characters
    let cleanedStr = value.replace(/[^0-9.,'-]/g, '');
    // Remove apostrophes used as thousand separators
    cleanedStr = cleanedStr.replace(/'/g, '');
    // Detect decimal separator
    const lastComma = cleanedStr.lastIndexOf(',');
    const lastDot = cleanedStr.lastIndexOf('.');
    let decimalSeparator = '';

    if (lastComma > lastDot) {
      decimalSeparator = ',';
    } else if (lastDot > lastComma) {
      decimalSeparator = '.';
    }

    if (decimalSeparator) {
      // Identify thousand separator
      const thousandSeparator = decimalSeparator === '.' ? ',' : '.';
      // Remove thousand separators
      cleanedStr = cleanedStr.split(thousandSeparator).join('');
      // Replace decimal separator with a dot
      cleanedStr = cleanedStr.replace(decimalSeparator, '.');
    } else {
      // No decimal separator found; remove all commas and dots
      cleanedStr = cleanedStr.replace(/[.,]/g, '');
    }

    // Convert to number
    const number = Number(cleanedStr);

    return number;
  }

  static transformDate(value: string): Date | string {
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

    // As a fallback, return the string itself in the hopes that it will be formatted
    // inside the google sheet
    return value;
  }

  static transformCategory(value: string): string | null {
    return detectCategoryByTextAnalysis(value) ?? null;
  }
}
