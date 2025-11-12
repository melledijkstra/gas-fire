import { clientEntrypoints, clientRoot } from "./vite.config"
import type { KnipConfig } from 'knip'

const entries = clientEntrypoints.map((entry) => {
  // knip is not able to parse HTML files, instead use the imported JS instead
  // which in this case is the `Dialog.svelte`
  const filename = entry.template.replace('index.html', 'Dialog.svelte')
  return`${clientRoot}/${filename}`
})

export default {
  "entry": entries,
  "project": ["src/**/*.{ts,svelte}"],
  "ignoreDependencies": [
    // is actually used in vite.config.ts for the coverage engine
    '@vitest/coverage-v8',
    // global types for Google Apps Script
    '@types/google-apps-script',
    // from the core package we never directly import
    // instead from 'flowbite-svelte'
    'flowbite'
  ],
  "ignore": [
    // basically exports the exposed functions, we can ignore that also
    "src/server/index.ts",
    // ignore exposed function which are never imported in the src code, but available 
    // to the user in the google sheets environment
    "src/server/exposed_functions.ts",
    // remote calls made from the frontend, they won't be imported in the src code
    "src/server/remote-calls.ts",
    // functions that execute when google sheets UI loads
    "src/server/ui.ts",
  ]
} satisfies KnipConfig;