/// <reference types="vitest/config" />
import {
  BuildOptions,
  ServerOptions,
  UserConfig,
  defineConfig,
} from 'vite';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwind from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { viteSingleFile } from 'vite-plugin-singlefile';
import packageInfo from './package.json';
import { buildFrontendBundlesPlugin, type DialogEntry } from './src/plugins/frontendBundlesPlugin';

const PORT = 3000;
export const clientRoot = './src/client';
const outDir = './dist';
const serverEntry = './src/server/index.ts';
const copyAppscriptEntry = './appsscript.json';
const devServerWrapper = './dev/dev-server-wrapper.html';

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
  }
];

const sharedConfig = defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageInfo.version),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

const keyPath = resolve(__dirname, './certs/key.pem');
const certPath = resolve(__dirname, './certs/cert.pem');

const devServerOptions: ServerOptions = {
  port: PORT,
};

// use key and cert settings only if they are found
if (existsSync(keyPath) && existsSync(certPath)) {
  devServerOptions.https = {
    key: readFileSync(resolve(__dirname, './certs/key.pem')),
    cert: readFileSync(resolve(__dirname, './certs/cert.pem')),
  };
}

const clientServeConfig: UserConfig = {
  ...sharedConfig,
  plugins: [svelte(), tailwind()],
  server: devServerOptions,
  root: clientRoot,
};

const clientBuildConfig = ({ filename, template }: DialogEntry) =>
  defineConfig({
    ...sharedConfig,
    plugins: [svelte(), tailwind(), viteSingleFile({ useRecommendedBuildConfig: true })],
    root: resolve(__dirname, clientRoot, filename),
    build: {
      sourcemap: false,
      write: false, // don't write to disk
      outDir,
      emptyOutDir: true,
      minify: true,
      rollupOptions: {
        input: resolve(__dirname, clientRoot, template),
      },
    },
  });

const serverBuildOptions: BuildOptions = {
  // this is to make sure the v8 engine of the GAS environment can run the code
  // Note: it is not confirmed this is the latest target supported by GAS
  // they are very vague about the exact version
  target: 'es2019',
  emptyOutDir: true,
  lib: {
    entry: resolve(__dirname, serverEntry),
    fileName: 'server',
    name: 'globalThis',
    formats: ['iife'],
  },
  minify: false, // needed to work with footer
  rollupOptions: {
    output: {
      entryFileNames: 'server.js',
      extend: true,
      footer: (chunk) =>
        chunk.exports
          .map((exportedFunction) => `function ${exportedFunction}() {};`)
          .join('\n'),
    },
  },
};

const buildIFrame = (entrypoint: DialogEntry) => ({
  src: devServerWrapper,
  dest: './',
  rename: `${entrypoint.filename}.html`,
  transform: (contents: string) =>
    contents
      .toString()
      .replace(/__PORT__/g, String(PORT))
      .replace(/__FILE_NAME__/g, entrypoint.template),
});

const buildConfig = defineConfig(({ mode }) => {
  const targets = [{ src: copyAppscriptEntry, dest: './' }];

  if (mode === 'development') {
    targets.push(...clientEntrypoints.map(buildIFrame));
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
        baseDir: __dirname,
      }),
    ],
    build: serverBuildOptions,
    esbuild: {
      target: serverBuildOptions.target || 'es2019',
      keepNames: true,
    },
  };
});

const testConfig: UserConfig = {
  ...sharedConfig,
  test: {
    globals: true,
    setupFiles: ['./test-setup.ts'],
    // Pin the timezone to UTC so that `new Date(y, m, d)` always produces UTC
    // midnight regardless of the machine's local timezone. This matches the
    // behaviour callers rely on: dates constructed by the parser are at
    // midnight in whichever timezone the process runs in (in production that is
    // the spreadsheet's timezone; in tests it is UTC).
    env: {
      TZ: 'UTC',
    },
    coverage: {
      exclude: [
        'src/fixtures/**',
        'src/plugins/**',
        'src/stories/**'
      ],
      reporter: ['text', 'json', 'html', 'lcov'],
      provider: 'v8',
    }
  },
};

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
  if (mode === 'test' || mode === 'benchmark') {
    return testConfig;
  } else if (command === 'serve') {
    // for 'serve' mode, we only want to serve the client bundle locally
    return clientServeConfig;
  } else if (command === 'build') {
    // for 'build' mode, we have two paths: build assets for local development, and build for production
    return buildConfig({ command, mode });
  }
  return {};
});
