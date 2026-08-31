import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwind from '@tailwindcss/vite'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { ServerOptions, defineConfig } from 'vite'
import packageInfo from './package.json' with { type: 'json' }

export const PORT = 3000
export const clientRoot = './src/client'

export const sharedConfig = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageInfo.version),
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
})

//
// Used when running in SERVE mode (using pnpm serve)
// These certificates are created using mkcert
// see `pnpm setup:https` command in package.json
//
const keyPath = resolve(import.meta.dirname, './certs/key.pem')
const certPath = resolve(import.meta.dirname, './certs/cert.pem')

const devServerOptions: ServerOptions = {
  port: PORT,
}

if (existsSync(keyPath) && existsSync(certPath)) {
  devServerOptions.https = {
    key: readFileSync(keyPath),
    cert: readFileSync(certPath),
  }
}

export default defineConfig(() => ({
  ...sharedConfig,
  plugins: [svelte(), tailwind()],
  server: devServerOptions,
}))
