import type { StorybookConfig } from '@storybook/svelte-vite';
import { join, dirname } from 'path';

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(require.resolve(join(value, 'package.json')));
}

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx|svelte)'],
  addons: [
    getAbsolutePath('@storybook/addon-links'),
    getAbsolutePath('@storybook/addon-essentials'),
    getAbsolutePath('@storybook/addon-interactions'),
    '@storybook/addon-svelte-csf'
  ],
  framework: getAbsolutePath('@storybook/svelte-vite'),
  viteFinal: async (config) => {
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
