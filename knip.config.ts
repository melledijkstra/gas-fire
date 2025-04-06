import { resolve } from "path"
import { clientEntrypoints, clientRoot } from "./vite.config"

const entries = clientEntrypoints.map((entry) => {
  // knip is not able to parse HTML files, instead use the imported JS instead
  // which in this case is the `Dialog.svelte`
  const filename = entry.template.replace('index.html', 'Dialog.svelte')
  return resolve(clientRoot, filename)
})

export default {
  "entry": entries,
  "project": ["src/**/*.{ts,svelte}"]
}