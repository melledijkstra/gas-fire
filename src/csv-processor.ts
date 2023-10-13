const sourceSheetId = 1093484485;
const AUTO_FILL_COLUMNS = [
  5, // balance column
  9, // category icon
  13, // hours column
  14, // disabled column
];

const FireSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
const sheets = FireSpreadsheet.getSheets();
const Props = PropertiesService.getUserProperties();
const sourceSheet = getSheetById(sourceSheetId);

function getSheetById(
  id: number
): GoogleAppsScript.Spreadsheet.Sheet | undefined {
  return sheets.find((sheet) => sheet.getSheetId() === id);
}

const FireColumns = [
  'ref',
  'iban',
  'date',
  'amount',
  'balance',
  'contra_account',
  'description',
  'comments',
  'icon',
  'category',
  'label',
  'import_date',
  'hours',
  'disabled',
  'contra_iban',
  'currency',
];

function buildColumn<T>(
  column: InputColumn,
  transformer: (value: string) => T
): (data: Table) => T[] {
  return (data: Table): T[] => {
    const rowCount = data.length;
    const columnTable = Utils.transpose(data); // try to transpose somewhere else
    if (columnTable[column] !== undefined) {
      return columnTable[column].map((val) => transformer(val));
    } else {
      return new Array(rowCount);
    }
  };
}

function buildNewTableData(input: Table, columnImportRules: FireColumnRules) {
  let output: Table = [];
  const rowCount = input.length;
  for (const columnName of FireColumns) {
    if (!(columnName in columnImportRules) || !columnImportRules[columnName]) {
      output.push(new Array(rowCount));
      continue;
    }
    const colRule = columnImportRules[columnName] as ColumnRule<any>;
    let column: any[];
    try {
      column = colRule(input);
      column = Utils.ensureLength(column, rowCount);
    } catch (e) {
      Logger.log(e);
      column = new Array(rowCount);
    }
    output.push(column);
  }
  output = Utils.transpose(output); // flip columns to rows
  return output;
}
