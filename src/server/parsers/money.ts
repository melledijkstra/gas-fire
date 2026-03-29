import { getSpreadsheetLocale } from "../utils/spreadsheet";
import { Logger } from "@/common/logger";

export const parseMoney = (value: string | number): number => {
  // If already a number, return it directly
  if (typeof value === 'number') return value;
  // If not a number neither a string, then we can't return a valid number
  if (typeof value !== 'string') return Number.NaN;

  if (!value.trim()) return 0;

  // Remove currency symbols and irrelevant characters
  // Keeping digits, minus sign, and potential separators (., ' and space)
  let cleanedStr = value.replace(/[^\d.,'\s-]/g, '').trim();

  // If the string is empty after cleaning, it means it had no valid characters, return 0.
  if (!cleanedStr) return 0;

  // If there are no digits but there is a minus sign, return NaN, else 0
  if (!/\d/.test(cleanedStr)) {
    return cleanedStr.includes('-') ? Number.NaN : 0;
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
    } catch (error) {
      Logger.warn("Failed to use Intl.NumberFormat to determine decimal separator: " + error);
    }
  }

  if (decimalSeparator) {
    // Find the position of the decimal separator
    const decimalSeparatorIndex = cleanedStr.lastIndexOf(decimalSeparator);
    // Split the string into integer and fractional parts
    const integerPart = cleanedStr.substring(0, decimalSeparatorIndex);
    const fractionalPart = cleanedStr.substring(decimalSeparatorIndex + 1);

    // Remove any non-digit characters from the integer part (except minus sign)
    const cleanedIntegerPart = integerPart.replace(/[^\d-]/g, '');
    // Remove any non-digit characters from the fractional part
    const cleanedFractionalPart = fractionalPart.replace(/[^\d]/g, '');

    // Reconstruct the number string with a standard dot as decimal separator
    cleanedStr = cleanedIntegerPart + '.' + cleanedFractionalPart;
  } else {
    // No decimal separator found; remove all non-digit, non-minus chars
    cleanedStr = cleanedStr.replace(/[^\d-]/g, '');
  }

  // Convert to number
  const number = Number(cleanedStr);

  return number;
};
