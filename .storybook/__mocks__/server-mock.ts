import { ReactRenderer } from '@storybook/react';
import { DecoratorFunction } from '@storybook/types';

enum StrategyOption {
  AuroraFinancialGroup = 'aurora',
  CeruleanTrustBank = 'cerulean',
  EmeraldCapitalPartners = 'emerald',
}

let strategyOptions: Record<string, string>;

class ServerFunctionsMock {
  static getStrategyOptions = async (): Promise<Record<string, string>> => {
    if (strategyOptions) {
      return strategyOptions;
    }
    return StrategyOption;
  };
}

export const serverFunctions = ServerFunctionsMock;

type ServerMockArguments = {
  strategyOptions?: Record<string, string>;
};

export const ServerMockDecorator: DecoratorFunction<
  ReactRenderer,
  ServerMockArguments
> = (Story, { args }) => {
  if (args && args.strategyOptions) {
    strategyOptions = args.strategyOptions;
  }
  return Story();
};
