import { StorybookConfig } from '@storybook/react-webpack5';
import { join, dirname } from 'path';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../src/client/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
  ],
  framework: '@storybook/react-webpack5',
  docs: {
    autodocs: 'tag',
  },
  webpackFinal: async (config) => {
    if (config?.resolve?.alias) {
      // @ts-ignore
      config.resolve.alias['../utils/serverFunctions'] = require.resolve(
        './__mocks__/server-mock.ts'
      );
    }
    return config;
  },
};
export default config;
