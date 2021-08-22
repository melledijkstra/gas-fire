class Config {
  static getConfig(): Strategy {
    return {
      'n26': {
        beforeImport: [
          Utils.deleteLastRow,
          Utils.deleteFirstRow,
          Utils.sortByDate(n26Cols.Date),
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
          (table) => Utils.autoFillColumns(table, AUTO_FILL_COLUMNS)
        ],
      },
      'rabobank': {
        beforeImport: [
          Utils.deleteLastRow,
          Utils.deleteFirstRow,
          Utils.sortByDate(raboCols.Datum)
        ],
        columnImportRules: {
          ref: buildColumn(raboCols.Volgnr, parseInt),
          iban: buildColumn(raboCols.Iban, String),
          date: buildColumn(raboCols.Datum, (val) => new Date(val)),
          amount: buildColumn(raboCols.Bedrag, Utils.transformMoneyColumn),
          category: null,
          contra_account: buildColumn(raboCols.NaamTegenpartij, String),
          contra_iban: buildColumn(raboCols.Tegenrekening, String),
          currency: buildColumn(raboCols.Munt, String),
          description: buildColumn(raboCols.Omschrijving1, String),
          label: buildColumn(raboCols.Omschrijving2, String),
        },
        afterImport: [
          (table) => Utils.autoFillColumns(table, AUTO_FILL_COLUMNS)
        ]
      }
    }
  }
}