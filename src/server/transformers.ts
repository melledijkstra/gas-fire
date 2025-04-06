import { detectCategoryByTextAnalysis } from './category-detection';
import { getSpreadsheetLocale } from './utils/spreadsheet';

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

  static transformDate(value: string): Date | string {
    const locale = getSpreadsheetLocale();

    const getDateParts = (parts: number[]): { year: number, month: number, day: number } => {
      const [part1, part2, part3] = parts;
      return {
        year: part3,
        month: locale === 'en-US' ? part1 : part2,
        day: locale === 'en-US' ? part2 : part1
      };
    }

    // List of possible formats and their corresponding parsers.
    // Add or modify formats as needed.
    const formats = [
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
        parser: (str: string) => {
          const parts = str.split("/").map(Number)
          const { year, month, day } = getDateParts(parts);
          return new Date(Date.UTC(year, month - 1, day));
        }
      },
      {
        // Format with dots
        // EU: "dd.MM.yyyy"
        // US: "MM.dd.yyyy"
        regex: /^\d{2}\.\d{2}\.\d{4}$/,
        parser: (str: string) => {
          const parts = str.split(".").map(Number);
          const { year, month, day } = getDateParts(parts);
          return new Date(Date.UTC(year, month - 1, day));
        }
      },
      {
        // Format: 20/6/24
        regex: /^\d{1,2}\/\d{1,2}\/\d{2}$/,
        parser: (str: string) => {
          const parts = str.split("/").map(Number);
          // Handle two-digit year
          const currentYear = new Date().getFullYear()
          const currentMillenium = currentYear - (currentYear % 100);
          const year = parts[2] + currentMillenium
          const month = parts[1]
          const day = parts[0]
          return new Date(Date.UTC(year, month - 1, day));
        }
      }
    ];

    // Try each format.
    for (const format of formats) {
      if (!format.regex.test(value)) {
        continue;
      }

      const date = format.parser(value);
      if (date instanceof Date && !isNaN(date.getTime())) {
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
