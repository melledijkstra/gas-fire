import type {
  ServerResponse,
  BankOptions,
  RawTable,
  ImportPreviewReport,
  TransactionMeta,
} from '@/common/types';
import { fn } from 'storybook/test'
import type * as publicServerFunctions from '@/server/index';
import { fireTableMock } from '@/fixtures/fire-table';

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
    _table: RawTable,
    _strategy: string
  ): Promise<ServerResponse<ImportPreviewReport>> {
    console.log('previewPipeline mock called');
    await sleep(2000);

    const rows = fireTableMock.map(row => row.map(String));
    const hashes = rows.map((_, i) => `mocked-hash-${i + 1}`);
    const metas = ['valid', 'valid', 'duplicate', 'removed', 'valid', 'duplicate'] as const;
    const actions = ['import', 'import', 'skip', 'skip'] as const;

    const duplicateCount = metas.filter(status => status === 'duplicate').length;
    const removedCount = metas.filter(status => status === 'removed').length;
    const validCount = rows.length - duplicateCount - removedCount;

    return {
      success: true,
      data: {
        summary: {
          duplicateCount,
          removedCount,
          rulesApplied: 3,
          totalRows: rows.length,
          validCount,
        },
        rows,
        hashes,
        transactionMeta: hashes.reduce<Record<string, TransactionMeta>>((acc, hash, i) => {
          acc[hash] = { status: metas[i] ?? 'valid', action: actions[i] ?? 'import' };
          return acc;
        }, {}),
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