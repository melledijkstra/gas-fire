const BALANCE_COLUMN = 5;

const macroDeleteDuplicateTransaction = () => {
  // get current spreadsheet
  const spreadsheet = SpreadsheetApp.getActive();
  const sheet = spreadsheet.getActiveSheet();

  const cellOfRowToDelete = sheet.getCurrentCell();
  if (cellOfRowToDelete?.getColumn() !== BALANCE_COLUMN) {
    SpreadsheetApp.getUi().alert(
      'Please select the balance column of the row to be deleted and try again'
    );
    return;
  }
  const cellBelow = cellOfRowToDelete.offset(1, 0);
  // we copy and paste the value hardcoded in the same cell
  // this prevents errors when deleting the selected column (otherwise formula breaks for some reason)
  cellBelow.copyTo(cellBelow, SpreadsheetApp.CopyPasteType.PASTE_VALUES, false);
  // delete the selected row (cellBelow will be moved up and be at the deleted row index)
  sheet.deleteRow(cellOfRowToDelete.getRow());
  // copy the formula back into the hardcoded value we put in the cell earlier (as if nothing happened ;)
  cellBelow.copyTo(
    cellOfRowToDelete,
    SpreadsheetApp.CopyPasteType.PASTE_FORMULA,
    false
  );
};
