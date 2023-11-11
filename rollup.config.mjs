import { defineConfig } from 'rollup';
import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import copy from 'rollup-plugin-copy';

const extensions = ['.ts', '.js'];

export const preventTreeShakingPlugin = () => {
  return {
    name: 'no-treeshaking',
    resolveId(source, importer) {
      if (!importer) {
        // let's not theeshake entry points, as we're not exporting anything in Apps Script files
        return { id: source, moduleSideEffects: 'no-treeshake' };
      }
      return null;
    },
  };
};

const clientConfig = defineConfig({
  input: ['./src/client/import.js', './src/client/import-preview.js'],
  output: {
    dir: 'dist',
    format: 'commonjs',
  },
  plugins: [
    preventTreeShakingPlugin(),
    nodeResolve({
      extensions,
    }),
    babel({
      extensions,
      babelHelpers: 'runtime',
    }),
    copy({
      targets: [
        {
          src: [
            './src/client/*.html',
            './src/client/*.css',
            './appsscript.json',
          ],
          dest: './dist',
        },
      ],
    }),
  ],
});

const serverConfig = defineConfig({
  input: ['./src/server/index.ts', './src/server/remote-calls.ts'],
  output: {
    dir: 'dist/',
    format: 'esm',
  },
  plugins: [
    preventTreeShakingPlugin(),
    nodeResolve({
      extensions,
    }),
    json(),
    babel({
      extensions,
      babelHelpers: 'runtime',
    }),
  ],
});

export default [clientConfig, serverConfig];
