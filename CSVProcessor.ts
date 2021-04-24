enum n26Cols {
  Date,
  Payee,
  AccountNumber,
  TransactionType,
  PaymentReference,
  Category,
  Amount,
  AmountForeignCurrency,
  ForeignCurrencyType,
  ExchangeRate
}

enum raboCols {
  Ref,
  Date
}

type InputColumn = n26Cols | raboCols

enum StrategyOption {
  N26 = "n26",
  // RABO = "rabobank"
}

const sourceSheetId = 1093484485
const AUTO_FILL_COLUMNS = [
  5, // balance column
  9, // category icon
  12, // hours column
  14, // disabled column
]

const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet()
const sheets = FireSpreadsheet.getSheets()
const Props = PropertiesService.getUserProperties()
const sourceSheet = getSheetById(sourceSheetId)

type Table = string[][]

function getSheetById(id: number): GoogleAppsScript.Spreadsheet.Sheet {
  return sheets.find(sheet => sheet.getSheetId() === id)
}

/**
 * A column function returns the values for that column
 * it can generate the column based on the data in the CSV
 */
type ColumnRule<T> = (data: Table) => T[]

const FireColumns = [
  'ref',
  'iban',
  'date',
  'amount',
  'balance',
  'contra_account',
  'description',
  'satisfaction',
  'icon',
  'category',
  'label',
  'hours',
  'contra_iban'
]

interface FireColumnRules {
  ref: ColumnRule<number>,
  iban: ColumnRule<string>,
  date: ColumnRule<Date>,
  amount: ColumnRule<number>,
  contra_account?: ColumnRule<string>,
  description?: ColumnRule<string>,
  satisfaction?: ColumnRule<number>,
  category: ColumnRule<string>,
  label?: ColumnRule<string>,
  contra_iban: ColumnRule<string>,
  currency?: ColumnRule<string>
}

type Strategy = {
  [key in StrategyOption]: {
    beforeImport: Array<(data: Table) => Table>,
    columnImportRules: FireColumnRules,
    afterImport: Array<(data: Table) => void>,
    autoFillColumns?: number[]
  }
}

type ServerResponse = {
  message: string
}

function buildColumn<T>(
  column: InputColumn,  
  transformer: (value: string, index?: number, array?: string[]) => T
): (data: Table) => T[]
{
  return (data: Table): T[] => {
    const rowCount = data.length
    const columnTable = transpose(data) // try to transpose somewhere else
    if (columnTable[column] !== undefined) {
      return columnTable[column].map((val) => transformer(val))
    } else {
      return new Array(rowCount)
    }
  }
}

function deleteFirstRow(data: Table): Table {
  data.shift()
  return data
}

function deleteLastRow(data: Table): Table {
  data.pop()
  return data
}

function sortByDate(dateColumn: InputColumn) {
  return (data: Table) => {
    data.sort(
      (row1, row2) => new Date(row1[dateColumn]).getUTCDate() - new Date(row2[dateColumn]).getUTCDate()
    ).reverse()
    return data
  }
}

const strategies: Strategy = {
  'n26': {
    beforeImport: [
      deleteLastRow,
      deleteFirstRow,
      sortByDate(n26Cols.Date),
    ],
    columnImportRules: {
      ref: null,
      iban: (data) => new Array(data.length).fill(BankAccount.N26),
      date: buildColumn(n26Cols.Date, (val) => new Date(val)),
      amount: buildColumn(n26Cols.Amount, parseFloat),
      category: buildColumn(n26Cols.Category, String),
      contra_account: buildColumn(n26Cols.Payee, String),
      label: buildColumn(n26Cols.TransactionType, String),
      description: buildColumn(n26Cols.PaymentReference, String),
      contra_iban: buildColumn(n26Cols.AccountNumber, String),
      currency: buildColumn(n26Cols.ForeignCurrencyType, String),
    },
    afterImport: [
      (table) => autoFillColumns(table, AUTO_FILL_COLUMNS)
    ],
  }
}

function buildNewTableData(input: Table, columnImportRules: FireColumnRules) {
  let output: Table = []
  const rowCount = input.length
  for (const columnName of FireColumns) {
    if (!(columnName in columnImportRules) || !columnImportRules[columnName]) {
      output.push(new Array(rowCount))
      continue
    }
    const colRule = columnImportRules[columnName] as ColumnRule<any>
    let column: any[]
    try {
      column = colRule(input)
      if (column.length < rowCount) {
        column = column.fill(null, column.length, rowCount - 1)
      }
    } catch(e) {
      Logger.log(e)
      column = new Array(rowCount)
    }
    output.push(column)
  }
  output = transpose(output) // flip columns to rows
  return output
}

/**
 * This function gets called by client side script 
 * @see file-input.html
 */
function processCSV(input: Table, importStrategy: StrategyOption): ServerResponse {
  sourceSheet.activate()
  sourceSheet.showSheet()
  if (!(importStrategy in strategies)) {
    throw new Error(`Import strategy ${importStrategy} is not defined!`)
  }

  const { beforeImport, columnImportRules, afterImport } = strategies[importStrategy]

  for (const rule of beforeImport) {
    input = rule(input)
  }
  let output = buildNewTableData(input, columnImportRules)
  importData(output)
  for (const rule of afterImport) {
    rule(output)
  }

  const msg = `imported ${output.length} rows!`
  Logger.log(`processCSV done: ${msg}`)
  return {
    message: msg,
  }
}
