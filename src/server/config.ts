import { FIRE_COLUMNS } from '@/common/constants';
import type { FireColumn } from '@/common/constants';
import { slugify } from './helpers';

const CONFIG_CACHE_KEY = 'cache.config'

// PENDING: Make this configurable by the user, what if they rename the sheets?
export const SOURCE_SHEET_NAME = 'source'
export const CATEGORIES_SHEET_NAME = 'categories'
export const CONFIG_SHEET_NAME = 'import-settings'

// const rabobankConfig: Strategy =
//   columnImportRules: {
//     ref: buildColumn(raboCols.Volgnr, parseInt),
//   },
// };

// const openbankConfig: Strategy = {
//   columnImportRules: {
//     date: buildColumn(openbankCols.Fecha, (val) => {
//       let [day, month, year] = val.split('/');
//       let yearNum = +year;
//       if (year && year.length === 2) {
//         // if year is of length 2 it means it only provides the year since 2000
//         // to fix we add 2000
//         yearNum = +year + 2000;
//       }
//       return new Date(new Date(+yearNum, +month - 1, +day).toDateString());
//     }),
//   },
// };

const parseBoolean = (value: string | boolean) =>
  String(value).toLowerCase() === 'true' || value === true;

type ColumnMap = {
  [key in FireColumn]?: string;
};

type ConfigParams = {
  accountId: string;
  columnMap?: ColumnMap;
  autoFillColumnIndices?: number[];
  autoFillEnabled?: boolean;
  autoCategorizationEnabled?: boolean;
}

export class Config {
  private readonly columnMap: ColumnMap
  public autoFillEnabled: boolean
  public autoCategorizationEnabled: boolean
  public autoFillColumnIndices: number[]
  private readonly accountId: string

  constructor({
    accountId,
    columnMap,
    autoFillColumnIndices,
    autoFillEnabled,
    autoCategorizationEnabled,
  }: ConfigParams) {
    this.accountId = accountId
    this.columnMap = columnMap ?? {}
    this.autoFillColumnIndices = autoFillColumnIndices ?? []
    this.autoFillEnabled = autoFillEnabled ?? false
    this.autoCategorizationEnabled = autoCategorizationEnabled ?? false
  }

  getAccountId(): string {
    return this.accountId;
  }

  getColumnIndex(fireColumn: FireColumn, headers: string[]): number | undefined {
    const importColumn = this.columnMap?.[fireColumn];
    if (importColumn) {
      return headers.indexOf(importColumn);
    }
  }

  private static loadColumnMapping(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
    const columnMapConfig = sheet.getSheetValues(5, 1, sheet.getLastRow(), -1);

    // first row contains account identifiers
    const accountIdentifiers: string[] =
      (columnMapConfig
        .shift() // take the first row
        ?.slice(1) // remove the first cell containing "Column Mapping"
        ?.filter(Boolean) ?? []) // remove any empty strings
        .map(slugify); // slugify the account identifiers

    const result: Record<string, ColumnMap> = {};

    for (const account of accountIdentifiers) {
      result[account] = {};
    }

    // filter out any empty rows which do not contain a fire column definition
    const cleanColumnConfig = columnMapConfig.filter((row) => !!row?.[0]);

    for (const row of cleanColumnConfig) {
      const fireColumnName = row[0] as FireColumn; // first column contains the FIRE column name
      if (!FIRE_COLUMNS.includes(fireColumnName)) {
        continue;
      }
      // ignore first row which contains the FIRE column name
      // ensure we only take as many columns as there are accounts
      const columnValues = row.slice(1, accountIdentifiers.length + 1);
      // iterate over the accounts and map fire column with the import column
      for (let i = 0; i < accountIdentifiers.length; i++) {
        const account = accountIdentifiers[i]
        const value = columnValues[i]
        result[account][fireColumnName] = value ?? null;
      }
    }

    return result;
  }

  /**
   * Function that loads the configuration from the CONFIG_SHEET_NAME sheet.
   */
  private static loadConfigurations(): Record<string, Config> {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()
    const configSheet = spreadsheet.getSheetByName(CONFIG_SHEET_NAME)

    // retrieves column mappings per account
    const columnMapping = this.loadColumnMapping(configSheet);

    // explanation:
    // first row contains configuration labels which we don't need
    const rawConfigs = configSheet.getSheetValues(1, 2, 4, -1);
    const configs: Record<string, Config> = {};

    // first row contains account identifiers
    const accounts: string[] =
      rawConfigs
        .shift() // take the first row
        ?.filter(Boolean) ?? [] // remove any empty strings

    for (let i = 0; i < accounts.length; i++) {
      const account = slugify(accounts[i]);
      // first row contains the auto fill column indices
      // second row contains the auto fill enabled flag
      // third row contains the auto categorization enabled flag
      const autoFillColumnIndices = rawConfigs[0][i].split(',').map(Number);
      const autoFillEnabled = parseBoolean(rawConfigs[1][i]);
      const autoCategorizationEnabled = parseBoolean(rawConfigs[2][i]);

      configs[account] = new Config({
        accountId: account,
        columnMap: columnMapping[account],
        autoFillColumnIndices,
        autoFillEnabled,
        autoCategorizationEnabled,
      });
    }

    return configs;
  }

  static getConfigurations(): Record<string, Config> {
    const cache = CacheService.getDocumentCache();
    const cachedConfig = cache.get(CONFIG_CACHE_KEY);

    if (cachedConfig) {
      try {
        return JSON.parse(cachedConfig) as Record<string, Config>;
      } catch(error) {
        console.error('Failed to parse cached configuration:', error);
      }
    }

    const configs = this.loadConfigurations();

    cache.put(CONFIG_CACHE_KEY, JSON.stringify(configs), 30);

    return configs;
  }

  static getAccountConfiguration(accountId: string): Config | undefined {
    const configs = this.getConfigurations();

    if (configs?.[accountId]) {
      return configs[accountId];
    }
  }

  /**
   * Retrieves the column name of this account's specific configuration for the given FIRE column.
   * @param columnName the FIRE column lookup name to match with the import column name
   * @returns {string} the reference column name or undefined if not found
   */
  getImportColumnNameByFireColumn(columnName: FireColumn): string | undefined {
    if (this.columnMap?.[columnName]) {
      return this.columnMap[columnName];
    }
  }
}
