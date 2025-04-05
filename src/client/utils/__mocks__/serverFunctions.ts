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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const StrategyOptions = {
  aurora_financial_group: 'Aurora Financial Group',
  cerulean_trust_bank: 'Cerulean Trust Bank',
  emerald_capital_partners: 'Emerald Capital Partners',
}

class ServerFunctions implements Partial<ServerFunctionsInterface> {
  getBankAccounts(): Record<string, string> {
    console.log('getBankAccounts mock called');
    return {
      n26: 'N26',
      rabobank: 'Rabobank',
    };
  };

  debugImportSettings() {
    console.log('debugImportSettings mock called');
  }

  importCSV(
    _inputTable: Table,
    _importStrategy: string
  ): ServerResponse {
    console.log('importCSV mock called');
    return {
      message: 'Successfully imported CSV',
    };
  };

  calculateNewBalance(
    _strategy: string,
    _values: number[]
  ): number {
    console.log('calculateNewBalance mock called');
    return 1000;
  };

  generatePreview(
    table: Table,
    _strategy: string
  ): {
    result: Table;
    newBalance?: number;
  } {
    console.log('generatePreview mock called');
    return {
      result: table,
      newBalance: 1234,
    };
  };

  getStrategyOptions = fn(async () => {
    await sleep(1000);
    return StrategyOptions;
  });

  executeAutomaticCategorization(): void {
    console.log('executeAutomaticCategorization mock called');
  };

  mailNetWorth(): void {
    console.log('mailNetWorth mock called');
  };

  onOpen(): void {
    console.log('onOpen mock called');
  };

  openFileUploadDialog(): void {
    console.log('openFileUploadDialog mock called');
  };

  openAboutDialog(): void {
    console.log('openAboutDialog mock called');
  };

  openSettingsDialog(): void {
    console.log('openSettingsDialog mock called');
  };

  MD5(_value: string): string {
    console.log('MD5 mock called');
    return 'mocked-md5';
  };

  GET_PROJECT_VERSION(): string {
    console.log('GET_PROJECT_VERSION mock called');
    return 'mocked-version';
  };

  executeFindDuplicates(): void {
    console.log('executeFindDuplicates mock called');
  };

  getBankAccountOptions(): StrategyOptions {
    console.log('getBankAccountOptions mock called');
    return StrategyOptions;
  };
  
  getBankAccountOptionsCached() {
    console.log('getBankAccountOptionsCached mock called');
    return {};
  };
}

export const serverFunctions = new ServerFunctions();