import { getImportRulesSheet } from '../globals'
import { Logger } from '@/common/logger'

export class RuleSheet {
  /**
   * Reads raw string data from the 'import-rules' sheet, omitting the header row.
   * Returns an empty array if the sheet doesn't exist or has no data.
   */
  static getRulesData(): string[][] {
    const sheet = getImportRulesSheet()
    if (!sheet) {
      Logger.log('import-rules sheet not found. Skipping rule processing.')
      return []
    }

    const lastRow = sheet.getLastRow()
    if (lastRow <= 1) {
      return [] // No data, just headers or empty
    }

    const lastColumn = sheet.getLastColumn()
    if (lastColumn < 1) {
      return []
    }

    // Read all data except the first row (headers)
    const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getDisplayValues()

    return values
  }
}
