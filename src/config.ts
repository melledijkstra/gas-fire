const defaultAfterImport = [
  (table: Table) => Utils.autoFillColumns(table, AUTO_FILL_COLUMNS),
];

class Config {
  static getConfig(): Strategy {
    return {
      n26: {
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
          category: null,
          contra_account: buildColumn(n26Cols.Payee, String),
          label: buildColumn(n26Cols.TransactionType, String),
          description: buildColumn(n26Cols.PaymentReference, String),
          contra_iban: buildColumn(n26Cols.AccountNumber, String),
          currency: buildColumn(n26Cols.ForeignCurrencyType, String),
        },
        afterImport: defaultAfterImport,
      },
      rabobank: {
        beforeImport: [
          Utils.deleteLastRow,
          Utils.deleteFirstRow,
          Utils.sortByDate(raboCols.Datum),
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
        afterImport: defaultAfterImport,
      },
      bbva: {
        beforeImport: [
          Utils.deleteLastRow,
          Utils.deleteFirstRow,
          Utils.sortByDate(bbvaCols.Date),
        ],
        columnImportRules: {
          ref: null,
          iban: (data) => new Array(data.length).fill(BankAccount.BBVA),
          date: buildColumn(bbvaCols.Date, (val) => Utils.transformDate(val)),
          amount: buildColumn(bbvaCols.Amount, Utils.transformMoneyColumn),
          category: null,
          contra_iban: null,
          currency: buildColumn(bbvaCols.Currency, String),
          description: buildColumn(bbvaCols.Comments, String),
          label: buildColumn(bbvaCols.SubjectLine, String),
        },
        afterImport: defaultAfterImport,
      },
      openbank: {
        beforeImport: [
          Utils.deleteFirstRow,
          Utils.deleteLastRow,
          // open bank has some empty columns when importing
          (table) => Utils.deleteColumns(table, [0, 2, 4, 6, 8]),
        ],
        columnImportRules: {
          ref: null,
          iban: (data) => new Array(data.length).fill(BankAccount.OPENBANK),
          date: buildColumn(openbankCols.Fecha, (val) => {
            let [day, month, year] = val.split('/');
            let yearNum = +year;
            if (year && year.length === 2) {
              // if year is of length 2 it means it only provides the year since 2000
              // to fix we add 2000
              yearNum = +year + 2000;
            }
            return new Date(+yearNum, +month - 1, +day);
          }),
          amount: buildColumn(openbankCols.Importe, Utils.transformMoneyColumn),
          category: null,
          contra_account: null,
          label: null,
          description: buildColumn(openbankCols.Concepto, String),
          contra_iban: null,
          currency: null,
        },
        afterImport: defaultAfterImport,
      },
    };
  }
}
