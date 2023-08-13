import { defineConfig } from "rollup";
import { babel } from "@rollup/plugin-babel";
import { nodeResolve } from "@rollup/plugin-node-resolve";

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

const rollupConfig = defineConfig({
  input: "./src/index.ts",
  output: {
    dir: "build",
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
  ],
});

export default rollupConfig;
