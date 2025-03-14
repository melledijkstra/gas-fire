/// <reference types="vitest/config" />
import {
  BuildOptions,
  Plugin,
  ServerOptions,
  UserConfig,
  build,
  defineConfig,
} from 'vite';
import type { OutputAsset, RollupOutput } from 'rollup'; 
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { writeFile } from 'fs/promises';
import packageInfo from './package.json';

const PORT = 3000;
const clientRoot = './src/client';
const outDir = './dist';
const serverEntry = './src/server/index.ts';
const copyAppscriptEntry = './appsscript.json';
const devServerWrapper = './dev/dev-server-wrapper.html';

type DialogEntry = {
  name: string;
  filename: string;
  template: string;
};

const clientEntrypoints: Array<DialogEntry> = [
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
  // {
  //   name: 'CLIENT:settings',
  //   filename: 'settings-dialog',
  //   template: 'settings-dialog/index.html',
  // }
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
  plugins: [svelte()],
  server: devServerOptions,
  root: clientRoot,
};

const clientBuildConfig = ({ filename, template }: DialogEntry) =>
  defineConfig({
    ...sharedConfig,
    plugins: [svelte(), viteSingleFile({ useRecommendedBuildConfig: true })],
    root: resolve(__dirname, clientRoot, filename),
    build: {
      sourcemap: false,
      write: false, // don't write to disk
      outDir,
      emptyOutDir: true,
      minify: true,
      rollupOptions: {
        input: resolve(__dirname, clientRoot, template),
        output: {
          format: 'iife', // needed to use globals from UMD builds
          dir: outDir,
        },
      },
    },
  });

const serverBuildOptions: BuildOptions = {
  emptyOutDir: true,
  minify: false, // needed to work with footer
  lib: {
    entry: resolve(__dirname, serverEntry),
    fileName: 'server',
    name: 'globalThis',
    formats: ['iife'],
  },
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

const isRollupOutput = (output: unknown): output is RollupOutput => !!(output as RollupOutput)?.output

/**
 * This builds the client app bundles for production, and writes them to disk.
 * Because multiple client entrypoints (dialogs) are built, we need to loop through
 * each entrypoint and build the client bundle for each. Vite doesn't have great tooling for
 * building multiple single-page apps in one project, so we have to do this manually with a
 * post-build closeBundle hook (https://rollupjs.org/guide/en/#closebundle).
 */
function buildFrontendBundlesPlugin(): Plugin {
  return {
    name: 'build-client-production-bundles',
    async closeBundle() {
      this.info('Building client production bundles...');
      for (const clientEntrypoint of clientEntrypoints) {
        this.info(`Building client bundle for ${clientEntrypoint.name}`);
        const buildOutput = await build(clientBuildConfig(clientEntrypoint));

        if (isRollupOutput(buildOutput) && !!(buildOutput.output[0] as unknown as OutputAsset)?.source) {
          const outputAsset = buildOutput.output[0] as unknown as OutputAsset
          await writeFile(
            resolve(__dirname, outDir, `${clientEntrypoint.filename}.html`),
            outputAsset.source
          );
        }
      }
      this.info('Finished building client bundles!');
    },
  };
}

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
      mode === 'production' && buildFrontendBundlesPlugin(),
    ],
    build: serverBuildOptions,
    esbuild: {
      keepNames: true,
    },
  };
});

const testConfig: UserConfig = {
  ...sharedConfig,
  test: {
    globals: true,
    setupFiles: ['./test-setup.ts'],
  },
};

// https://vitejs.dev/config/
export default defineConfig(async ({ command, mode }) => {
  if (mode === 'test') {
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
