import { parseDate } from './parsers/date'
import { parseMoney } from './parsers/money'

export class Transformers {
  static transformMoney(value: string | number): number {
    return parseMoney(value)
  }

  static transformDate(value: string): Date {
    return parseDate(value)
  }
}
