import type { SvelteRenderer } from '@storybook/svelte';
import type { DecoratorFunction } from '@storybook/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

enum StrategyOption {
  AuroraFinancialGroup = 'aurora',
  CeruleanTrustBank = 'cerulean',
  EmeraldCapitalPartners = 'emerald',
}

let strategyOptions: Record<string, string>;

class ServerFunctionsMock {
  static getStrategyOptions = async (): Promise<Record<string, string>> => {
    await sleep(1000);
    if (strategyOptions) {
      return strategyOptions;
    }
    return StrategyOption;
  };
  static processCSV = async (): Promise<Record<string, string>> => {
    await sleep(2000);
    return { message: 'CSV Processed!' };
  };
}

export const serverFunctions = ServerFunctionsMock;

type ServerMockArguments = {
  strategyOptions?: Record<string, string>;
};

export const ServerMockDecorator: DecoratorFunction<
  SvelteRenderer,
  ServerMockArguments
> = (Story, { args }) => {
  if (args && args.strategyOptions) {
    strategyOptions = args.strategyOptions;
  }
  return Story();
};
