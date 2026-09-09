import type { YMYLColumn } from '@/common/constants'
import { YMYL_COLUMNS } from '@/common/constants'
import { Logger } from '@/common/logger'
import { YMYLTable } from '@/common/table/YMYLTable'
import { Table } from '@/common/table/Table'
import type { CellValue } from '@/common/types'
import { AccountUtils } from '../accounts/account-utils'
import { Config } from '../config'
import { Transformers } from '../transformers'
import type { YMYLColumnParsers } from '../types'

export class YMYLTableFactory {
  /**
   * Processes raw CSV input data and shapes it into the YMYL spreadsheet structure.
   *
   * Uses the account configuration to map CSV columns to YMYL columns, applying
   * transformations where needed (date parsing, money parsing, etc.).
   *
   * @param headers - The CSV header row
   * @param rows - The CSV data rows (without header)
   * @param config - The account configuration with column mappings
   * @returns A YMYLTable with data structured according to YMYL_COLUMNS
   */
  static fromAccountSpecification({
    headers,
    rows,
    config,
  }: {
    headers: string[]
    rows: CellValue[][]
    config: Config
  }): YMYLTable {
    const output: CellValue[][] = []
    const rowCount = rows.length
    const cols = Table.transpose(rows)

    function buildColumn<T>(
      ymylColumn: YMYLColumn,
      transformer?: (value: string) => T,
    ): (T | null)[] {
      const columnIndex = config.getColumnIndex(ymylColumn, headers)
      if (typeof columnIndex === 'number' && cols[columnIndex] !== undefined) {
        return cols[columnIndex].map((val) => {
          if (val === '' || val === null || val === undefined) return null
          return transformer ? transformer(String(val)) : (val as unknown as T)
        })
      }
      return new Array<T | null>(rowCount).fill(null)
    }

    const importDate = new Date()

    const columnImportParsers: YMYLColumnParsers = {
      ref: null,
      iban: () => new Array(rowCount).fill(AccountUtils.getAccountIban(config.getAccountId())),
      date: () => buildColumn('date', Transformers.transformDate),
      amount: () => buildColumn('amount', Transformers.transformMoney),
      category: () => buildColumn('category'),
      contra_account: () => buildColumn('contra_account'),
      label: () => buildColumn('label'),
      import_date: () => Array.from({ length: rowCount }, () => importDate),
      description: () => buildColumn('description'),
      contra_iban: () => buildColumn('contra_iban'),
      currency: () => buildColumn('currency'),
    }

    for (const columnName of YMYL_COLUMNS) {
      const colParser = columnImportParsers[columnName as keyof YMYLColumnParsers]

      // If no parser defined for this column, fill with nulls
      if (!colParser) {
        output.push(new Array(rowCount).fill(null))
        continue
      }

      let column: CellValue[]
      try {
        column = colParser()
        column = Table.ensureLength(column, rowCount)
      }
      catch (e) {
        Logger.error('Failed to process column ' + columnName + ':', e)
        column = new Array(rowCount).fill(null)
      }
      output.push(column as CellValue[])
    }

    // output is currently column-oriented, transpose to row-oriented
    const transposed = Table.transpose(output)
    return new YMYLTable(transposed)
  }
}

/** @deprecated Use YMYLTableFactory */
export const FireTableFactory = YMYLTableFactory
