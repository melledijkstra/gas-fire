import { defineConfig } from "rollup";
import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import { copy } from "@web/rollup-plugin-copy";

const inputFile = './src/index.ts';

const preventTreeShakingPlugin = () => {
    return {
      name: 'no-treeshaking',
      resolveId(id, importer) {
        if (!importer) {
            // let's not theeshake entry points, as we're not exporting anything in Apps Script files
          return { id, moduleSideEffects: "no-treeshake" }
        }
        return null;
      }
    }
  };

const extensions = [".ts", ".js"];

const frontendBundle = defineConfig({
  input: "./src/client/index.js",
  output: {
    file: "dist/index.js",
    format: "esm",
  },
  plugins: [
    preventTreeShakingPlugin(),
    nodeResolve({
      extensions,
    }),
    babel({ 
      extensions,
      babelHelpers: "runtime"
    }),
    copy({ rootDir: './src/client/dialogs', patterns: ['**/*.html'] })
  ],
});

const serverBundle = defineConfig({
  input: "./src/server/index.ts",
  output: {
    file: "dist/server.js",
    format: "esm",
  },
  plugins: [
    preventTreeShakingPlugin(),
    nodeResolve({
      extensions,
    }),
    babel({ 
      extensions,
      babelHelpers: "runtime"
    }),
    copy({ rootDir: './public', patterns: ['*'] })
  ],
});

export default [frontendBundle, serverBundle];
