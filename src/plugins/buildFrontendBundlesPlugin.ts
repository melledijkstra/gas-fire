import { build, Plugin, InlineConfig } from 'vite';
import type { OutputAsset, RollupOutput } from 'rollup';
import { resolve } from 'path';
import { writeFile } from 'fs/promises';

export type DialogEntry = {
  name: string;
  filename: string;
  template: string;
};

export interface BuildFrontendBundlesPluginOptions {
  clientEntrypoints: Array<DialogEntry>;
  clientBuildConfig: (entry: DialogEntry) => InlineConfig;
  outDir: string;
  baseDir: string;
}

const isRollupOutput = (output: unknown): output is RollupOutput => !!(output as RollupOutput)?.output;

/**
 * This builds the client app bundles for production, and writes them to disk.
 * Because multiple client entrypoints (dialogs) are built, we need to loop through
 * each entrypoint and build the client bundle for each. Vite doesn't have great tooling for
 * building multiple single-page apps in one project, so we have to do this manually with a
 * post-build closeBundle hook (https://rollupjs.org/guide/en/#closebundle).
 */
export function buildFrontendBundlesPlugin(options: BuildFrontendBundlesPluginOptions): Plugin {
  return {
    name: 'build-client-production-bundles',
    async closeBundle() {
      this.info('Building client production bundles...');
      for (const clientEntrypoint of options.clientEntrypoints) {
        this.info(`Building client bundle for ${clientEntrypoint.name}`);
        const buildOutput = await build(options.clientBuildConfig(clientEntrypoint));

        if (isRollupOutput(buildOutput) && !!(buildOutput.output[0] as unknown as OutputAsset)?.source) {
          const outputAsset = buildOutput.output[0] as unknown as OutputAsset;
          await writeFile(
            resolve(options.baseDir, options.outDir, `${clientEntrypoint.filename}.html`),
            outputAsset.source
          );
        }
      }
      this.info('Finished building client bundles!');
    },
  };
}
