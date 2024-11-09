/* eslint-disable import/no-extraneous-dependencies */
/// <reference types="vitest/config" />
import {
  BuildOptions,
  Plugin,
  ServerOptions,
  UserConfig,
  build,
  defineConfig,
} from 'vite';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import react from '@vitejs/plugin-react-swc';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { writeFile } from 'fs/promises';

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
  {
    name: 'CLIENT:settings',
    filename: 'settings-dialog',
    template: 'settings-dialog/index.html',
  },
];

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

const sharedConfig = defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});

const clientServeConfig: UserConfig = {
  ...sharedConfig,
  plugins: [react()],
  server: devServerOptions,
  root: clientRoot,
};

const clientBuildConfig = ({ filename, template }: DialogEntry) =>
  defineConfig({
    ...sharedConfig,
    plugins: [react(), viteSingleFile({ useRecommendedBuildConfig: true })],
    root: resolve(__dirname, clientRoot, filename),
    build: {
      sourcemap: false,
      write: false, // don't write to disk
      outDir,
      emptyOutDir: true,
      minify: true,
      rollupOptions: {
        input: resolve(__dirname, clientRoot, template),
        external: [
          'react',
          'react-dom',
          'react-bootstrap',
          '@mui/material',
          '@emotion/react',
          '@emotion/styled',
          'gas-client',
          '@types/react',
        ],
        output: {
          format: 'iife', // needed to use globals from UMD builds
          dir: outDir,
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            '@mui/material': 'MaterialUI',
            '@emotion/react': 'emotionReact',
            '@emotion/styled': 'emotionStyled',
            'gas-client': 'GASClient',
          },
        },
      },
    },
  });

const serverBuildConfig: BuildOptions = {
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

/**
 * This builds the client react app bundles for production, and writes them to disk.
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
      // eslint-disable-next-line no-restricted-syntax
      for (const clientEntrypoint of clientEntrypoints) {
        this.info(`Building client bundle for ${clientEntrypoint.name}`);
        // eslint-disable-next-line no-await-in-loop
        const buildOutput = await build(clientBuildConfig(clientEntrypoint));
        // eslint-disable-next-line no-await-in-loop
        await writeFile(
          resolve(__dirname, outDir, `${clientEntrypoint.filename}.html`),
          // @ts-expect-error - output is an array of RollupOutput
          buildOutput?.output[0].source
        );
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
    build: serverBuildConfig,
    esbuild: {
      keepNames: true,
    },
  };
});

const testConfig: UserConfig = {
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
