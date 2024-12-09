import { ReactRenderer } from '@storybook/react';
import { DecoratorFunction } from '@storybook/types';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const bankOptions = {
  'Aurora Financial Group': 'aurora',
  'Cerulean Trust Bank': 'cerulean',
  'Emerald Capital Partners': 'emerald',
} as const;

let bankAccountOptions: Record<string, string>;

class ServerFunctionsMock {
  static getAccountOptions = async (): Promise<Record<string, string>> => {
    await sleep(1000);
    if (bankAccountOptions) {
      return bankAccountOptions;
    }
    return bankOptions;
  };
  static processCSV = async (): Promise<Record<string, string>> => {
    await sleep(2000);
    return { message: 'CSV Processed!' };
  };
}

export const serverFunctions = ServerFunctionsMock;

type ServerMockArguments = {
  bankOptions?: Record<string, string>;
};

export const ServerMockDecorator: DecoratorFunction<
  ReactRenderer,
  ServerMockArguments
> = (Story, { args }) => {
  if (args && args.bankOptions) {
    bankAccountOptions = args.bankOptions;
  }
  return Story();
};
