// @see https://github.com/ramda/ramda/blob/v0.27.0/source/transpose.js
function transpose<T>(outerlist: T[][]): T[][] {
  let i = 0
  let result = []
  while (i < outerlist.length) {
    let innerlist = outerlist[i]
    let j = 0
    while (j < innerlist.length) {
      if (typeof result[j] === 'undefined') {
        result[j] = []
      }
      result[j].push(innerlist[j])
      j += 1
    }
    i += 1
  }
  return result
}

function importData(data: Table) {
  const rowCount = data.length
  const colCount = data[0].length
  Logger.log(`importing data (rows: ${rowCount}, cols: ${colCount})`)
  sourceSheet
    .insertRowsBefore(2, rowCount)
    .getRange(2, 1, rowCount, colCount)
    .setValues(data as Table)
}

function autoFillColumns(data: Table, columns: number[]) {
  for (const column of columns) {
    const rowCount = data.length
    const sourceRange = sourceSheet.getRange(2 + rowCount, column)
    const destinationRange = sourceSheet.getRange(2, column, rowCount + 1) // + 1 because sourceRange needs to be included
    sourceRange.autoFill(destinationRange, SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES)
  }
}
