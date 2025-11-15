import type {
  ServerResponse,
  StrategyOptions,
  Table,
} from '@/common/types';
import { fn } from 'storybook/test'
import type * as publicServerFunctions from '@/server/index';

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
  async getBankAccounts(): Promise<Record<string, string>> {
    console.log('getBankAccounts mock called');
    return {
      n26: 'N26',
      rabobank: 'Rabobank',
    };
  };

  async debugImportSettings() {
    console.log('debugImportSettings mock called');
  }

  async importCSV(
    _inputTable: Table,
    _importStrategy: string
  ): Promise<ServerResponse> {
    console.log('importCSV mock called')
    await sleep(5000)
    return {
      message: 'Successfully imported CSV',
    };
  };

  async generatePreview(
    table: Table,
    _strategy: string
  ): Promise<{
    result: Table;
    newBalance?: number;
  }> {
    console.log('generatePreview mock called');
    return {
      result: table,
      newBalance: 1234,
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

  async getBankAccountOptions(): Promise<StrategyOptions> {
    console.log('getBankAccountOptions mock called');
    return StrategyOptions;
  };

  getBankAccountOptionsCached = fn(async (): Promise<StrategyOptions> => {
    await sleep(1000);
    console.log('getBankAccountOptionsCached mock called');
    return StrategyOptions;
  });
}

export const serverFunctions = new ServerFunctions();