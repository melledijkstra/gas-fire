import { Logger } from '@/common/logger'
import { YMYLTable } from '@/common/table/YMYLTable'
import { YMYLSheet } from '../spreadsheet/YMYLSheet'
import { categorizeYMYLTable } from './categorize'

/**
 * Performs automatic categorization on the current active spreadsheet
 * Can be called from the menu
 */
export const executeAutomaticCategorization = () => {
  const ymylSheet = new YMYLSheet()

  // 1. first part of the code focusses UX and makes sure the user is focussed on the right sheet
  // also it filters the sheet to only show rows that have no category set
  const ui = SpreadsheetApp.getUi()
  const response = ui.alert(
    'Do you want to run automatic categorization?',
    ui.ButtonSet.YES_NO,
  )

  if (response !== ui.Button.YES) {
    return
  }

  try {
    Logger.time('executeAutomaticCategorization')

    ymylSheet.activate()

    const filter = ymylSheet.getFilter()
    if (!filter) {
      throw new Error(
        'Automatic categorization script needs an actual filter configured on the source sheet table! Please set a filter before trying again',
      )
    }

    const ymylTable = ymylSheet.getDataTable()
    const categoryColIndex = YMYLTable.getYMYLColumnIndex('category')

    // we set a filter which shows only rows without category
    const blankFilterCriteria = SpreadsheetApp.newFilterCriteria()
      .whenCellEmpty()
      .build()

    filter.setColumnFilterCriteria(categoryColIndex + 1, blankFilterCriteria)

    const { categoryUpdates, rowsCategorized } = categorizeYMYLTable(ymylTable)

    if (rowsCategorized === 0) {
      ui.alert('No rows were categorized!')
      return
    }

    if (categoryUpdates.length > 0) {
      ymylSheet.setValues(2, categoryColIndex + 1, categoryUpdates.length, 1, categoryUpdates)
    }

    ui.alert(`Succesfully categorized ${rowsCategorized} rows!`)
  }
  catch (error) {
    Logger.error(error)
    ui.alert(`An error occurred during categorization: ${error instanceof Error ? error.message : String(error)}`)
  }
  finally {
    Logger.timeEnd('executeAutomaticCategorization')
  }
}
