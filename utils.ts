class Utils {
  /**
   * @see https://github.com/ramda/ramda/blob/v0.27.0/source/transpose.js
   */
  static transpose<T>(outerlist: T[][]): T[][] {
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
    
  static importData(data: Table) {
    const rowCount = data.length
    const colCount = data[0].length
    Logger.log(`importing data (rows: ${rowCount}, cols: ${colCount})`)
    sourceSheet
      .insertRowsBefore(2, rowCount)
      .getRange(2, 1, rowCount, colCount)
      .setValues(data as Table)
  }

  static autoFillColumns(data: Table, columns: number[]) {
    for (const column of columns) {
      const rowCount = data.length
      const sourceRange = sourceSheet.getRange(2 + rowCount, column)
      const destinationRange = sourceSheet.getRange(2, column, rowCount + 1) // + 1 because sourceRange needs to be included
      sourceRange.autoFill(destinationRange, SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES)
    }
  }

  static ensureLength(arr: any[], length: number) {
    if (arr.length < length) {
      arr = arr.fill(null, arr.length, length - 1)
    }
    return arr
  }

  static deleteFirstRow(data: Table): Table {
    data.shift()
    return data
  }
  
  static deleteLastRow(data: Table): Table {
    data.pop()
    return data
  }
  
  static sortByDate(dateColumn: InputColumn) {
    return (data: Table) => {
      data.sort(
        (row1, row2) => new Date(row1[dateColumn]).getUTCDate() - new Date(row2[dateColumn]).getUTCDate()
      ).reverse()
      return data
    }
  }
}
