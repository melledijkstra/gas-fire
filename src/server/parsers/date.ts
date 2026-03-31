import { getSpreadsheetLocale } from "../utils/spreadsheet";
import { Logger } from "@/common/logger";

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

export function parseDate(value: string): Date {
  const locale = getSpreadsheetLocale();

  // Extract just the date part if it contains a time or timestamp
  const cleanValue = value.split(/[\sT]/)[0];

  // Try each format.
  for (const format of DATE_FORMATS) {
    if (!format.regex.test(cleanValue)) {
      continue;
    }

    const date = format.parser(cleanValue, locale);
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      return date;
    }
  }

  // Log a warning and throw an Error to prevent silent data corruption
  Logger.warn(`Failed to parse date: "${value}" with locale: "${locale}"`);
  throw new Error(`Failed to parse date: "${value}"`);
}