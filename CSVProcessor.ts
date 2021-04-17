enum StrategyOption {
  N26 = "n26",
  RABO = "rabobank"
}

type Strategy = {
  [key in StrategyOption]: Array<(data: any[]) => any[]>
}

type ServerResponse = {
  message: string,
  data?: Array<any>
}

const strategies: Strategy = {
  'n26': [
    deleteLastRow,
    deleteFirstRow
  ],
  'rabobank': [
    deleteLastRow
  ]
}

function deleteFirstRow(data: Array<any>) {
  data.shift()
  return data
}

function deleteLastRow(data: Array<any>) {
  data.pop()
  return data
}

/**
 * This function gets called by client side script @see ./file-input.html
 */
function processCSV(input: Array<any>, importStrategy: StrategyOption): ServerResponse 
{
  Logger.log(['input', importStrategy, input])
  if (!(importStrategy in strategies)) {
    throw new Error(`Import strategy ${importStrategy} is not defined!`)
  }
  const importRules = strategies[importStrategy]
  let output: Array<any>
  for (const rule of importRules) {
    output = rule(input)
  }
  Logger.log([`output after ${importRules.length} import rule(s)`, output])
  //SpreadsheetApp.getActiveSheet().appendRow(jsonData);
  return {
    message: `${importRules.length} import rule(s)`,
    data: output
  }
}
