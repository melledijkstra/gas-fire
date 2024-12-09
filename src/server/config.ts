import { TableUtils, buildColumn } from './table-utils';
import { Transformers } from './transformers';
import type { ColumnMap, ConfigData, Table } from '@/common/types';
import type { Strategy } from './types';
import { N26Cols, raboCols, openbankCols } from './types';
import { AccountUtils } from './account-utils';
import { FIRE_COLUMNS } from '@/common/constants';
import type { FireColumn } from '@/common/types';
import { Logger } from '@/common/logger';

// PENDING: Make this configurable by the user, what if they rename the sheets?
export const SOURCE_SHEET_NAME = 'source';
export const CATEGORIES_SHEET_NAME = 'categories';
export const CONFIG_SHEET_NAME = 'import-settings';

const N26Config: Strategy = {
  beforeImport: [
    TableUtils.deleteLastRow,
    TableUtils.deleteFirstRow,
    TableUtils.sortByDate(N26Cols.BookingDate),
  ],
};

const rabobankConfig: Strategy = {
  beforeImport: [
    TableUtils.deleteLastRow,
    TableUtils.deleteFirstRow,
    TableUtils.sortByDate(raboCols.Datum),
  ],
  columnImportRules: {
    ref: buildColumn(raboCols.Volgnr, parseInt),
  },
};

const openbankConfig: Strategy = {
  beforeImport: [
    TableUtils.deleteFirstRow,
    TableUtils.deleteLastRow,
    // open bank has some empty columns when importing
    (table) => TableUtils.deleteColumns(table, [0, 2, 4, 6, 8]),
  ],
  columnImportRules: {
    date: buildColumn(openbankCols.Fecha, (val) => {
      let [day, month, year] = val.split('/');
      let yearNum = +year;
      if (year && year.length === 2) {
        // if year is of length 2 it means it only provides the year since 2000
        // to fix we add 2000
        yearNum = +year + 2000;
      }
      return new Date(new Date(+yearNum, +month - 1, +day).toDateString());
    }),
  },
};

const parseBoolean = (value: string | boolean) =>
  String(value).toLowerCase() === 'true' || value === true;

export class Config {
  /** @deprecated */
  static oldConfigCache: Record<string, Strategy> | null = null;

  constructor(private accountId: string, private configData: ConfigData) {}

  getAccountId(): string {
    return this.accountId;
  }

  /** @deprecated */
  static getOldConfig() {
    if (this.oldConfigCache) {
      return this.oldConfigCache;
    }

    const oldRootConfig = {
      N26: N26Config,
      rabobank: rabobankConfig,
      openbank: openbankConfig,
    };
    this.oldConfigCache = oldRootConfig;
    return oldRootConfig;
  }

  /**
   * Function that retrieves the import strategy rules for the given account.
   *
   * @param {string} accountId The account identifier to retrieve the configuration for
   * @returns {Strategy | undefined} The import strategy for the given account or undefined if
   * the strategy cannot be constructed for the given account
   */
  static retrieveAccountStrategy(accountId: string): Strategy | undefined {
    const accountConfig = this.getAccountConfiguration(accountId);
    const configData = accountConfig?.configData;

    if (!configData) {
      return;
    }

    let afterImport: Array<(data: Table) => void> = [];

    if (configData?.autoFillEnabled) {
      // add auto fill processing if enabled
      afterImport.push((table: Table) =>
        TableUtils.autoFillColumns(table, configData.autoFillColumnIndices)
      );
    }

    return {
      beforeImport: [],
      // prettier-ignore
      columnImportRules: {
        ref: null,
        iban: (data) => new Array(data.length).fill(AccountUtils.getBankIban(accountId)),
        date: buildColumn('date', accountConfig, Transformers.transformDate),
        amount: buildColumn('amount', accountConfig, Transformers.transformMoney),
        category: buildColumn('category', accountConfig),
        contra_account: buildColumn('contra_account', accountConfig),
        label: buildColumn('label', accountConfig),
        import_date: (data) => new Array(data.length).fill(new Date()),
        description: buildColumn('description', accountConfig),
        contra_iban: buildColumn('contra_iban', accountConfig),
        currency: buildColumn('currency', accountConfig),
      },
      afterImport,
    };
  }

  getColumnIndex(fireColumn: FireColumn, inputData: Table): number | undefined {
    const importColumn = this.configData.columnMap?.[fireColumn];
    if (importColumn) {
      const headerRow = inputData[0];
      return headerRow.indexOf(importColumn);
    }
  }

  static _loadColumnMapping(sheet: GoogleAppsScript.Spreadsheet.Sheet) {
    const columnMapConfig = sheet.getSheetValues(5, 1, sheet.getLastRow(), -1);

    // first row contains account identifiers
    const accountIdentifiers: string[] =
      columnMapConfig
        .shift() // take the first row
        ?.slice(1) // remove the first cell containing "Column Mapping"
        ?.filter(Boolean) ?? []; // remove any empty strings

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
        const account = accountIdentifiers[i];
        const value = columnValues[i];
        result[account][fireColumnName] = !value ? null : value;
      }
    }

    return result;
  }

  /**
   * Function that loads the configuration from the CONFIG_SHEET_NAME sheet.
   */
  static _loadConfigurations(): Record<string, Config> {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const configSheet = spreadsheet.getSheetByName(CONFIG_SHEET_NAME);

    // retrieves column mappings per account
    const columnMapping = this._loadColumnMapping(configSheet);

    // explanation:
    // first column contains configuration labels which we don't need
    const rawConfigs = configSheet.getSheetValues(1, 2, 4, -1);
    const configs: Record<string, Config> = {};

    // first row contains account identifiers
    const accounts: string[] =
      rawConfigs
        .shift() // take the first row
        ?.filter(Boolean) ?? []; // remove any empty strings

    for (let i = 0; i < accounts.length; i++) {
      const account = accounts[i];
      // first row contains the auto fill column indices
      // second row contains the auto fill enabled flag
      // third row contains the auto categorization enabled flag
      const autoFillColumnIndices = rawConfigs[0][i].split(',').map(Number);
      const autoFillEnabled = parseBoolean(rawConfigs[1][i]);
      const autoCategorizationEnabled = parseBoolean(rawConfigs[2][i]);

      configs[account] = new Config(account, {
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
    const cachedConfig = cache.get('config');

    Logger.log('config from cache?', !!cachedConfig);

    if (cachedConfig) {
      return this.deserializeAll(
        JSON.parse(cachedConfig) as Record<string, ConfigData>
      );
    }

    const configs = this._loadConfigurations();

    cache.put('config', JSON.stringify(this.serializeAll(configs)), 30);

    return configs;
  }

  static getAccountConfiguration(accountId: string): Config | undefined {
    const configs = this.getConfigurations();

    if (configs?.[accountId]) {
      return configs[accountId];
    }
  }

  serialize(): ConfigData {
    return this.configData;
  }

  static deserialize(accountId: string, configData: ConfigData): Config {
    return new Config(accountId, configData);
  }

  static deserializeAll(
    configs: Record<string, ConfigData>
  ): Record<string, Config> {
    const deserializedConfigs: Record<string, Config> = {};

    for (const [key, configData] of Object.entries(configs)) {
      deserializedConfigs[key] = this.deserialize(key, configData);
    }

    return deserializedConfigs;
  }

  static serializeAll(
    configs: Record<string, Config>
  ): Record<string, ConfigData> {
    const serializedConfigs: Record<string, ConfigData> = {};

    for (const [key, config] of Object.entries(configs)) {
      serializedConfigs[key] = config.serialize();
    }

    return serializedConfigs;
  }

  /**
   * Retrieves the column name of this account's specific configuration for the given FIRE column.
   * @param columnName the FIRE column lookup name to match with the import column name
   * @returns {string} the reference column name or undefined if not found
   */
  getImportColumnNameByFireColumn(columnName: FireColumn): string | undefined {
    if (this.configData.columnMap?.[columnName]) {
      return this.configData.columnMap[columnName];
    }
  }
}
