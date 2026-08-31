import { resolve } from 'path'
import { BuildOptions, defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwind from '@tailwindcss/vite'
import { type DialogEntry, buildFrontendBundlesPlugin } from './src/plugins/frontendBundlesPlugin.ts'
import { sharedConfig, clientRoot, PORT } from './vite.config.ts'

const outDir = './dist'
const serverEntry = './src/server/index.ts'
const copyAppscriptEntry = './appsscript.json'
const devServerWrapper = './dev/dev-server-wrapper.html'

export const clientEntrypoints: Array<DialogEntry> = [
  {
    name: 'CLIENT:about',
    filename: 'about-dialog',
    template: 'about-dialog/index.html',
  },
  {
    name: 'CLIENT:import',
    filename: 'import-dialog',
    template: 'import-dialog/index.html',
  },
  {
    name: 'CLIENT:enable-banking',
    filename: 'enable-banking-dialog',
    template: 'enable-banking-dialog/index.html',
  },
]

const clientBuildConfig = ({ filename, template }: DialogEntry) =>
  defineConfig({
    ...sharedConfig,
    plugins: [svelte(), tailwind(), viteSingleFile({ useRecommendedBuildConfig: true })],
    root: resolve(import.meta.dirname, clientRoot, filename),
    build: {
      sourcemap: false,
      write: false,
      outDir,
      emptyOutDir: true,
      minify: true,
      rollupOptions: {
        input: resolve(import.meta.dirname, clientRoot, template),
      },
    },
  })

const serverBuildOptions: BuildOptions = {
  target: 'es2019',
  emptyOutDir: true,
  lib: {
    entry: resolve(import.meta.dirname, serverEntry),
    fileName: 'server',
    name: 'globalThis',
    formats: ['iife'],
  },
  minify: false,
  rollupOptions: {
    output: {
      entryFileNames: 'server.js',
      extend: true,
      footer: chunk =>
        chunk.exports
          .map(exportedFunction => `function ${exportedFunction}() {};`)
          .join('\n'),
    },
  },
}

const buildIFrame = (entrypoint: DialogEntry) => ({
  src: devServerWrapper,
  dest: './',
  rename: `${entrypoint.filename}.html`,
  transform: (contents: string) =>
    contents
      .toString()
      .replace(/__PORT__/g, String(PORT))
      .replace(/__FILE_NAME__/g, entrypoint.template),
})

export default defineConfig(({ mode }) => {
  const targets = [{ src: copyAppscriptEntry, dest: './' }]

  if (mode === 'development') {
    targets.push(...clientEntrypoints.map(buildIFrame))
  }

  return {
    ...sharedConfig,
    plugins: [
      viteStaticCopy({
        targets,
      }),
      mode === 'production' && buildFrontendBundlesPlugin({
        clientEntrypoints,
        clientBuildConfig,
        outDir,
        baseDir: import.meta.dirname,
      }),
    ],
    build: serverBuildOptions,
    esbuild: {
      target: serverBuildOptions.target || 'es2019',
      keepNames: true,
    },
  }
})
