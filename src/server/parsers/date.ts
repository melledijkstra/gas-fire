import { FireSheet } from '../spreadsheet/FireSheet'
import { Logger } from '@/common/logger'

const getDateParts = (parts: number[], locale?: string): { year: number, month: number, day: number } => {
  const [part1, part2, part3] = parts
  return {
    year: part3,
    month: locale === 'en_US' ? part1 : part2,
    day: locale === 'en_US' ? part2 : part1,
  }
}

// List of possible formats and their corresponding parsers.
// Add or modify formats as needed.
const DATE_FORMATS = [
  {
    // ISO format: "yyyy-MM-dd"
    regex: /^\d{4}-\d{2}-\d{2}$/,
    parser: (str: string) => {
      const parts = str.split('-').map(Number)
      return new Date(parts[0], parts[1] - 1, parts[2])
    },
  },
  {
    // Format with dots
    // "yyyy.MM.dd"
    regex: /^\d{4}\.\d{2}\.\d{2}$/,
    parser: (str: string) => {
      const parts = str.split('.').map(Number)
      return new Date(parts[0], parts[1] - 1, parts[2])
    },
  },
  {
    // US format: "MM/dd/yyyy"
    // European format: "dd/MM/yyyy"
    regex: /^\d{2}\/\d{2}\/\d{4}$/,
    parser: (str: string, locale?: string) => {
      const parts = str.split('/').map(Number)
      const { year, month, day } = getDateParts(parts, locale)
      return new Date(year, month - 1, day)
    },
  },
  {
    // Format with dots
    // EU: "dd.MM.yyyy"
    // US: "MM.dd.yyyy"
    regex: /^\d{2}\.\d{2}\.\d{4}$/,
    parser: (str: string, locale?: string) => {
      const parts = str.split('.').map(Number)
      const { year, month, day } = getDateParts(parts, locale)
      return new Date(year, month - 1, day)
    },
  },
  {
    // Format with 2 digit year
    // EU: "dd/MM/yy"
    // US: "MM/dd/yy"
    regex: /^\d{1,2}\/\d{1,2}\/\d{2}$/,
    parser: (str: string, locale?: string) => {
      const parts = str.split('/').map(Number)
      // Handle two-digit year
      const currentYear = new Date().getFullYear()
      let year = parts[2] + Math.floor(currentYear / 100) * 100
      // If the resulting year is more than 20 years in the future,
      // assume it belongs to the previous century.
      if (year > currentYear + 20) {
        year -= 100
      }

      // Use locale to determine month/day order.
      const month = locale === 'en_US' ? parts[0] : parts[1]
      const day = locale === 'en_US' ? parts[1] : parts[0]
      return new Date(year, month - 1, day)
    },
  },
]

function parseTime(timeStr: string): { hours: number, minutes: number, seconds: number } | undefined {
  /**
   * Matches a time string in the format `HH:MM` or `HH:MM:SS`.
   *
   * The regex pattern breakdown:
   * - `(\d{1,2})` - Captures 1 or 2 digits for the hours (e.g., `9` or `12`)
   * - `:` - Matches a literal colon separator
   * - `(\d{2})` - Captures exactly 2 digits for the minutes (e.g., `05` or `59`)
   * - `(?::(\d{2}))?` - Optionally captures a second colon followed by exactly 2 digits for the seconds (e.g., `:30`)
   *
   * @example
   * // Matches "12:30" -> groups: ["12", "30", undefined]
   * // Matches "9:05:45" -> groups: ["9", "05", "45"]
   * // Does not match "123:00" or ":30"
   */

  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (timeMatch) {
    const hours = Number.parseInt(timeMatch[1], 10)
    const minutes = Number.parseInt(timeMatch[2], 10)
    const seconds = timeMatch[3] ? Number.parseInt(timeMatch[3], 10) : 0

    return { hours, minutes, seconds }
  }
}

export function parseDate(value: string): Date {
  const locale = FireSheet.getLocale()

  // Separate the date part from an optional time or timestamp component
  const [datePart, timePart] = value.trim().split(/[\sT]/)

  // Try each format.
  for (const format of DATE_FORMATS) {
    if (!format.regex.test(datePart)) {
      continue
    }

    const date = format.parser(datePart, locale)
    if (date instanceof Date && !Number.isNaN(date.getTime())) {
      // If a time component is present, apply it in local time to match the parsed date
      if (timePart) {
        const time = parseTime(timePart)
        if (time) {
          date.setHours(time.hours, time.minutes, time.seconds, 0)
        }
      }
      return date
    }
  }

  // Log a warning and throw an Error to prevent silent data corruption
  Logger.warn(`Failed to parse date: "${value}" with locale: "${locale}"`)
  throw new Error(`Failed to parse date: "${value}"`)
}
