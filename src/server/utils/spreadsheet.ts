/**
 * Removes all filter criterias present on the given filter
 * Can optionally prompt the user before removing the criterias
 *
 * @param {GoogleAppsScript.Spreadsheet.Filter} filter - the filter to remove the criterias from
 * @param {boolean} prompt - whether to prompt the user before removing the criterias
 * @returns {boolean} - true if the criterias were removed, false if the user decided not to remove them
 */
export const removeFilterCriteria = (
  filter: GoogleAppsScript.Spreadsheet.Filter,
  prompt = false
): boolean => {
  const ui = SpreadsheetApp.getUi();
  // the amount of columns spanning the filter
  const columns = filter.getRange().getNumColumns();
  // the column index where the filter starts
  const startColumn = filter.getRange().getColumn();
  const columnsWithCriteria = [];
  for (let col = 0; col < columns; col++) {
    const currentColumn = startColumn + col;
    const currentColumnCriteria = filter.getColumnFilterCriteria(currentColumn);
    if (currentColumnCriteria) {
      columnsWithCriteria.push(currentColumn);
    }
  }

  if (columnsWithCriteria.length === 0) {
    // no columns with criteria, nothing to do
    // return true because there are no criteria set
    return true;
  }

  let shouldRemoveCriterias = true;

  if (prompt) {
    const response = ui.alert(
      'This action requires active filter criterias to be removed\nRemove them and continue?',
      ui.ButtonSet.YES_NO
    );

    shouldRemoveCriterias = response === ui.Button.YES;
  }

  if (shouldRemoveCriterias) {
    for (const colIndex of columnsWithCriteria) {
      filter.removeColumnFilterCriteria(colIndex);
    }
    // make sure operations are executed and finished before continuing
    // otherwise the filter might not be removed on time
    SpreadsheetApp.flush();
    return true;
  }

  // return false, because there are still criterias set
  // and the user decided not to remove them
  return false;
};

export const activeSpreadsheet = (sheet?: GoogleAppsScript.Spreadsheet.Sheet) => {
  sheet?.activate()
  sheet?.showSheet()
}

export const getSpreadsheetLocale = (): string | undefined => {
  try {
    return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetLocale()
  } catch(error) {
    console.warn('Could not retrieve spreadsheet locale')
  }
}