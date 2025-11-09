import type { StorybookConfig } from '@storybook/svelte-vite';
import { createRequire } from 'module';
import { join, dirname } from 'path';

const require = createRequire(import.meta.url);

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
    getAbsolutePath("@storybook/addon-docs"),
    getAbsolutePath('@storybook/addon-svelte-csf'),
  ],
  framework: getAbsolutePath('@storybook/svelte-vite'),
};
export default config;
