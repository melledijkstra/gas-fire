import type { SvelteRenderer } from '@storybook/svelte';
import type { DecoratorFunction } from '@storybook/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

enum StrategyOption {
  aurora_financial_group = 'Aurora Financial Group',
  cerulean_trust_bank = 'Cerulean Trust Bank',
  emerald_capital_partners = 'Emerald Capital Partners',
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
