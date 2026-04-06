import type {
  ServerResponse,
  BankOptions,
  RawTable,
  ImportPreviewReport,
} from '@/common/types';
import { fn } from 'storybook/test'
import type * as publicServerFunctions from '@/server/index';
import { FIRE_COLUMNS } from '@/common/constants';

////////////////////////////////////////////////////////////////
// This mock is used by storybook, to mimic server functions
////////////////////////////////////////////////////////////////

type ServerFunctionsInterface = typeof publicServerFunctions;

type Promisified<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
  ? (...args: A) => Promise<R>
  : Promise<T[K]>;
};

type PromisifiedServerFunctionsInterface = Promisified<ServerFunctionsInterface>;


const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const StrategyOptions = {
  aurora_financial_group: 'Aurora Financial Group',
  cerulean_trust_bank: 'Cerulean Trust Bank',
  emerald_capital_partners: 'Emerald Capital Partners',
}

class ServerFunctions implements PromisifiedServerFunctionsInterface {
  async getBankAccounts(): Promise<ServerResponse<Record<string, string>>> {
    console.log('getBankAccounts mock called');
    return {
      success: true,
      data: {
        n26: 'N26',
        rabobank: 'Rabobank',
      }
    };
  };

  async debugImportSettings() {
    console.log('debugImportSettings mock called');
  }

  async importPipeline(
    data: RawTable,
    selectedBank: string
  ): Promise<ServerResponse> {
    console.log('importPipeline mock called with data:', data, 'and selectedBank:', selectedBank);
    await sleep(5000)
    return {
      success: true,
      message: `Successfully imported ${data.length} rows!`
    };
  };

  async previewPipeline(
    table: RawTable,
    _strategy: string
  ): Promise<ServerResponse<ImportPreviewReport>> {
    console.log('previewPipeline mock called');
    await sleep(2000);
    return {
      success: true,
      data: {
        headers: Array.from(FIRE_COLUMNS),
        summary: {
          duplicateCount: 2,
          removedCount: 1,
          rulesApplied: 3,
          totalRows: table.length,
          validCount: table.length - 3, // Assuming duplicates and removed rows are not valid
        },
        transactions: [{
          action: 'import',
          hash: 'mocked-hash-1',
          row: table[0],
          status: 'valid'
        }, {
          action: 'import',
          hash: 'mocked-hash-2',
          row: table[1],
          status: 'valid'
        },
        {
          action: 'skip',
          hash: 'mocked-hash-3',
          row: table[2],
          status: 'duplicate'
        },
        {
          action: 'skip',
          hash: 'mocked-hash-4',
          row: table[3],
          status: 'removed'
        }],
        newBalance: 1234.56,
      }
    };
  };

  async executeAutomaticCategorization(): Promise<void> {
    console.log('executeAutomaticCategorization mock called');
  };

  async mailNetWorth(): Promise<void> {
    console.log('mailNetWorth mock called');
  };

  async onOpen(): Promise<void> {
    console.log('onOpen mock called');
  };

  async openFileUploadDialog(): Promise<void> {
    console.log('openFileUploadDialog mock called');
  };

  async openAboutDialog(): Promise<void> {
    console.log('openAboutDialog mock called');
  };

  async openSettingsDialog(): Promise<void> {
    console.log('openSettingsDialog mock called');
  };

  async MD5(_value: string): Promise<string> {
    console.log('MD5 mock called');
    return 'mocked-md5';
  };

  async GET_PROJECT_VERSION(): Promise<string> {
    console.log('GET_PROJECT_VERSION mock called');
    return 'mocked-version';
  };

  async executeFindDuplicates(): Promise<void> {
    console.log('executeFindDuplicates mock called');
  };

  async getBankAccountOptions(): Promise<ServerResponse<BankOptions>> {
    console.log('getBankAccountOptions mock called');
    return { success: true, data: StrategyOptions };
  };

  getBankAccountOptionsCached = fn(async (): Promise<ServerResponse<BankOptions>> => {
    await sleep(1000);
    console.log('getBankAccountOptionsCached mock called');
    return { success: true, data: StrategyOptions };
  });
}

export const serverFunctions = new ServerFunctions();