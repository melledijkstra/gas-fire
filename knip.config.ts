import { resolve } from "path"
import { clientEntrypoints, clientRoot } from "./vite.config"
import type { KnipConfig } from 'knip'

const entries = clientEntrypoints.map((entry) => {
  // knip is not able to parse HTML files, instead use the imported JS instead
  // which in this case is the `Dialog.svelte`
  const filename = entry.template.replace('index.html', 'Dialog.svelte')
  return resolve(clientRoot, filename)
})

export default {
  "entry": entries,
  "project": ["src/**/*.{ts,svelte}"],
  "ignore": [
    // ignore exposed function which are never imported in the src code, but available to the user
    // in the google sheets environment
    "src/server/exposed_functions.ts",
    // basically exports the exposed functions, we can ignore that also
    "src/server/index.ts",
    // functions that execute when google sheets UI loads
    "src/server/ui.ts"
  ]
} satisfies KnipConfig;