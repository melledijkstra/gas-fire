import { defineConfig } from 'rollup';
import { babel } from '@rollup/plugin-babel';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';

const preventTreeShakingPlugin = () => {
  return {
    name: 'no-treeshaking',
    resolveId(id, importer) {
      if (!importer) {
        // let's not theeshake entry points, as we're not exporting anything in Apps Script files
        return { id, moduleSideEffects: 'no-treeshake' };
      }
      return null;
    },
  };
};

const extensions = ['.ts', '.js'];

const clientConfig = defineConfig({
  input: ['./client/src/index.ts', './client/src/import.ts'],
  output: {
    dir: 'dist/',
    format: 'commonjs',
    preserveModules: true,
  },
  plugins: [
    nodeResolve({
      extensions,
    }),
    babel({
      extensions,
      babelHelpers: 'runtime',
    }),
  ],
});

const serverConfig = defineConfig({
  input: ['./server/src/index.ts', './server/src/remote-calls.ts'],
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
