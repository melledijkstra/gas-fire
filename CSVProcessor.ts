const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
const sheets = FireSpreadsheet.getSheets()
const sourceSheet = getSheetById(1093484485) // "source" sheet ID

function getSheetById(id: number): GoogleAppsScript.Spreadsheet.Sheet {
  return sheets.find(sheet => sheet.getSheetId() === id)
}

enum StrategyOption {
  N26 = "n26",
  RABO = "rabobank"
}

type CSV = string[][]

type n26Columns = {
  "Date": string
  "Payee": string
  "Account number": string
  "Transaction type": string
  "Payment reference": string
  "Category": string
  "Amount (EUR)": number
  "Amount (Foreign Currency)": number
  "Type Foreign Currency": string
  "Exchange Rate": number
}

type Strategy = {
  [key in StrategyOption]: {
    importRules: Array<(data: CSV, ...args: any[]) => CSV>,
    autoFillColumns?: number[]
  }
}

const FireColumnNames = []
type FireColumns = [number, string, string, number, number]

type ServerResponse = {
  message: string,
  data?: CSV
}

const strategies: Strategy = {
  'n26': {
    importRules: [
      deleteLastRow,
      deleteFirstRow,
      (data) => moveColumns(data, [])
    ],
    autoFillColumns: [9, 13, 15]
  },
  'rabobank': {
    importRules: [
      deleteLastRow
    ]
  }
}

function deleteFirstRow(data: CSV) {
  data.shift()
  return data
}

function deleteLastRow(data: CSV) {
  data.pop()
  return data
}

function moveColumns(data: CSV, columnIds: [number, number][]): CSV {
  for (const movement of columnIds) {

  }
  return data
}

function autoFillColumns(columns: number[], rowCount: number) {
  for (const column of columns) {
    const sourceRange = sourceSheet.getRange(2 + rowCount, column)
    const destinationRange = sourceSheet.getRange(2, column, rowCount + 1) // + 1 because sourceRange needs to be included
    Logger.log(['source', sourceRange.getA1Notation(), 'destination', destinationRange.getA1Notation()])
    sourceRange.autoFill(destinationRange, SpreadsheetApp.AutoFillSeries.DEFAULT_SERIES)
  }
}

/**
 * This function gets called by client side script 
 * @see file-input.html
 */
function processCSV(input: CSV, importStrategy: StrategyOption): ServerResponse 
{
  sourceSheet.activate()
  sourceSheet.showSheet()
  Logger.log(['input', importStrategy, input])
  if (!(importStrategy in strategies)) {
    throw new Error(`Import strategy ${importStrategy} is not defined!`)
  }
  const strategy = strategies[importStrategy]
  let output: CSV
  for (const rule of strategy.importRules) {
    output = rule(input)
  }
  const rowCount = 1 // output.length
  const colCount = 6 // output[0].length
  sourceSheet
    .insertRowsBefore(2, rowCount)
    .getRange(2, 1, rowCount, colCount)
    .setValues([
      [1, "ES1915632626343266143636", new Date("2021-04-05"), -15.70, "Rocio Zaragoza", "wifi"],
    ])
  autoFillColumns(strategy.autoFillColumns, rowCount)
  const msg = `${strategy.importRules.length} import rule(s), imported ${rowCount} rows!`
  Logger.log([`output after ${msg}`, output])
  return {
    message: msg,
    data: output
  }
}
