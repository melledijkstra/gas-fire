import { clientEntrypoints, clientRoot } from './vite.config'
import type { KnipConfig } from 'knip'

const entries = clientEntrypoints.map((entry) => {
  // knip is not able to parse HTML files, instead use the imported JS instead
  // which in this case is the `Dialog.svelte`
  const filename = entry.template.replace('index.html', 'Dialog.svelte')
  return `${clientRoot}/${filename}`
})

export default {
  entry: entries,
  project: ['src/**/*.{ts,svelte}'],
  ignoreBinaries: [
    // used in the dev server to create a secure tunnel with a real domain
    // PENDING: double check if this is a built-in binary on the OS or not
    'mkcert',
  ],
  ignoreDependencies: [
    // is actually used in vite.config.ts for the coverage engine
    '@vitest/coverage-v8',
    // global types for Google Apps Script
    '@types/google-apps-script',
    // from the core package we never directly import
    // instead from 'flowbite-svelte'
    'flowbite',
    // only used to get a type, and the package is already installed because of svelte storybook dependencies
    '@storybook/svelte',
  ],
  ignore: [
    // plugin that generates the frontend bundles, but is not imported in the src code
    'src/plugins/frontendBundlesPlugin.ts',
  ],
} satisfies KnipConfig
