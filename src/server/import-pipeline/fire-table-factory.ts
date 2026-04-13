import { FIRE_COLUMNS } from '@/common/constants'
import type { FireColumn, CellValue } from '@/common/types'
import { Config } from '../config'
import { Table } from '@/common/table/Table'
import { FireTable } from '@/common/table/FireTable'
import { AccountUtils } from '../accounts/account-utils'
import { Transformers } from '../transformers'
import type { FireColumnRules } from '../types'
import { Logger } from '@/common/logger'

export class FireTableFactory {
  /**
   * Processes raw CSV input data and shapes it into the FIRE spreadsheet structure.
   *
   * Uses the account configuration to map CSV columns to FIRE columns, applying
   * transformations where needed (date parsing, money parsing, etc.).
   *
   * @param headers - The CSV header row
   * @param rows - The CSV data rows (without header)
   * @param config - The account configuration with column mappings
   * @returns A FireTable with data structured according to FIRE_COLUMNS
   */
  static fromAccountSpecification({
    headers,
    rows,
    config,
  }: {
    headers: string[]
    rows: CellValue[][]
    config: Config
  }): FireTable {
    const output: CellValue[][] = []
    const rowCount = rows.length
    const cols = Table.transpose(rows)

    function buildColumn<T>(
      fireColumn: FireColumn,
      transformer?: (value: string) => T,
    ): (T | null)[] {
      const columnIndex = config.getColumnIndex(fireColumn, headers)
      if (typeof columnIndex === 'number' && cols[columnIndex] !== undefined) {
        return cols[columnIndex].map((val) => {
          if (val === '' || val === null || val === undefined) return null
          return transformer ? transformer(String(val)) : (val as unknown as T)
        })
      }
      return new Array<T | null>(rowCount).fill(null)
    }

    // prettier-ignore
    const columnImportRules: FireColumnRules = {
      ref: null,
      iban: () => new Array(rowCount).fill(AccountUtils.getAccountIban(config.getAccountId())),
      date: () => buildColumn('date', Transformers.transformDate),
      amount: () => buildColumn('amount', Transformers.transformMoney),
      category: () => buildColumn('category'),
      contra_account: () => buildColumn('contra_account'),
      label: () => buildColumn('label'),
      import_date: () => Array.from({ length: rowCount }, () => new Date()),
      description: () => buildColumn('description'),
      contra_iban: () => buildColumn('contra_iban'),
      currency: () => buildColumn('currency'),
    }

    for (const columnName of FIRE_COLUMNS) {
      const colRule = columnImportRules[columnName as keyof FireColumnRules]

      // If no rule defined for this column, fill with nulls
      if (!colRule) {
        output.push(new Array(rowCount).fill(null))
        continue
      }

      let column: CellValue[]
      try {
        column = colRule()
        column = Table.ensureLength(column, rowCount)
      }
      catch (e) {
        Logger.error(e)
        column = new Array(rowCount).fill(null)
      }
      output.push(column as CellValue[])
    }

    // output is currently column-oriented, transpose to row-oriented
    const transposed = Table.transpose(output)
    return new FireTable(transposed)
  }
}
