/*********************************
 *    import webpack plugins
 ********************************/
import path from 'path';
import { DefinePlugin, Configuration } from 'webpack';
import CopyPlugin from 'copy-webpack-plugin';
import GasPlugin from 'gas-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import HtmlInlineScriptPlugin from 'html-inline-script-webpack-plugin';
import DynamicCDNPlugin from '@effortlessmotion/dynamic-cdn-webpack-plugin';
import moduleToCDN from 'module-to-cdn';

const isProd = process.env.NODE_ENV === 'production';

const publicPath = process.env.ASSET_PATH || '/';

// our destination directory
const destination = path.resolve(__dirname, 'dist');

// define server paths
const serverEntry = './src/server/index.ts';

// define appsscript.json file path
const copyAppscriptEntry = './appsscript.json';

const envVars = {};

/*********************************
 *    define entrypoints
 ********************************/

type EntryPoint = {
  name: string;
  entry: string;
  filename: string;
  template: string;
};

// IF UPDATE HERE, ALSO UPDATE 'server/ui.ts' !
const clientEntrypoints: Array<EntryPoint> = [
  {
    name: 'CLIENT:about',
    entry: './src/client/about-dialog/index.tsx',
    filename: 'about-dialog', // we'll add the .html suffix to these
    template: './src/client/about-dialog/index.html',
  },
  {
    name: 'CLIENT:import',
    entry: './src/client/import-dialog/index.tsx',
    filename: 'import-dialog', // we'll add the .html suffix to these
    template: './src/client/import-dialog/index.html',
  },
  {
    name: 'CLIENT:settings',
    entry: './src/client/settings-dialog/index.tsx',
    filename: 'settings-dialog', // we'll add the .html suffix to these
    template: './src/client/settings-dialog/index.html',
  },
];

/*********************************
 *    Declare settings
 ********************************/

// webpack settings for copying files to the destination folder
const copyFilesConfig: Configuration = {
  name: 'COPY FILES - appsscript.json',
  mode: 'production', // unnecessary for this config, but removes console warning
  entry: copyAppscriptEntry,
  output: {
    path: destination,
    publicPath,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: copyAppscriptEntry,
          to: destination,
        },
      ],
    }),
  ],
};

// webpack settings used by both client and server
const sharedClientAndServerConfig: Partial<Configuration> = {
  context: __dirname,
};

// webpack settings used by all client entrypoints
const clientConfig: Partial<Configuration> = {
  ...sharedClientAndServerConfig,
  mode: isProd ? 'production' : 'development',
  output: {
    path: destination,
    // this file will get added to the html template inline
    // and should be put in .claspignore so it is not pushed
    filename: 'main.js',
    publicPath,
    module: true,
    libraryTarget: 'module',
  },
  experiments: {
    outputModule: true,
  },
  optimization: {
    minimize: isProd ? true : false,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
  },
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      // typescript config
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};

type DynamicCDNEntry = {
  name: string;
  var: string;
  version: string;
  url: string;
};

// DynamicCdnWebpackPlugin settings
// these settings help us load 'react', 'react-dom' and the packages defined below from a CDN
const DynamicCdnWebpackPluginConfig = {
  // set "verbose" to true to print console logs on CDN usage while webpack builds
  verbose: process.env.VERBOSE ? true : false,
  only: [
    'react',
    'react-dom',
    'prop-types',
    'material-react-table',
    '@emotion/react',
    '@emotion/styled',
    'gas-client',
  ],
  resolver: (
    packageName: string,
    version: string,
    options: { env: string }
  ): DynamicCDNEntry | null => {
    const moduleDetails = moduleToCDN(packageName, version, options);
    const packageSuffix = isProd ? '.min.js' : '.js';

    // don't externalize react during development due to issue with react-refresh
    // https://github.com/pmmmwh/react-refresh-webpack-plugin/issues/334
    if (!isProd && packageName === 'react') {
      return null;
    }

    // define custom CDN configuration for new packages
    // "name" should match the package being imported
    // "var" is important to get right -- this should be the exposed global. Look up "webpack externals" for info.
    switch (packageName) {
      case 'material-react-table':
        return {
          name: packageName,
          var: 'MaterialReactTable',
          version: version,
          url: `https://unpkg.com/material-react-table@${version}/dist/index.esm.js`,
        };
      case '@emotion/react':
        return {
          name: packageName,
          var: 'emotionReact',
          version: version,
          url: `https://unpkg.com/@emotion/react@${version}/dist/emotion-react.umd${packageSuffix}`,
        };
      case '@emotion/styled':
        return {
          name: packageName,
          var: 'emotionStyled',
          version: version,
          url: `https://unpkg.com/@emotion/styled@${version}/dist/emotion-styled.umd${packageSuffix}`,
        };
      // externalize gas-client to keep bundle size even smaller
      case 'gas-client':
        return {
          name: packageName,
          var: 'GASClient',
          version: version,
          url: `https://unpkg.com/gas-client@${version}/dist/index.js`,
        };
      // return defaults/null depending if Dynamic CDN plugin finds package
      default:
        return moduleDetails;
    }
  },
};

// webpack settings used by each client entrypoint defined at top
const clientConfigs = clientEntrypoints.map<Configuration>(
  (clientEntrypoint) => {
    return {
      ...clientConfig,
      name: clientEntrypoint.name,
      entry: clientEntrypoint.entry,
      plugins: [
        new DefinePlugin({
          'process.env': JSON.stringify(envVars),
        }),
        // when analyzing bundle we don't want to inline the code
        // otherwise bundle analyzer can't inspect the different modules
        new HtmlWebpackPlugin({
          template: clientEntrypoint.template,
          filename: `${clientEntrypoint.filename}.html`,
          inlineSource: '^/.*(js|css)$', // embed all js and css inline, exclude packages from dynamic cdn insertion
          scriptLoading: 'module',
          inject: 'body',
        }),
        // this plugin allows us to add dynamically load packages from a CDN
        new DynamicCDNPlugin(DynamicCdnWebpackPluginConfig),
        // add the generated js code to the html file inline
        new HtmlInlineScriptPlugin(),
      ],
    } as Configuration;
  }
);

// webpack settings used by the server-side code
const serverConfig: Configuration = {
  ...sharedClientAndServerConfig,
  name: 'SERVER',
  // server config can't use 'development' mode
  // https://github.com/fossamagna/gas-webpack-plugin/issues/135
  mode: isProd ? 'production' : 'none',
  entry: serverEntry,
  output: {
    filename: 'server.js',
    path: destination,
    libraryTarget: 'this',
    publicPath,
  },
  resolve: {
    extensions: ['.ts', '.js', '.json'],
  },
  module: {
    rules: [
      // typescript config
      {
        test: /\.ts?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
        },
      },
    ],
  },
  optimization: {
    minimize: isProd ? true : false,
  },
  plugins: [
    new GasPlugin({
      // removes need for assigning public server functions to "global"
      autoGlobalExportsFiles: [serverEntry],
    }),
  ],
};

const config: Array<Configuration> = [
  // 1. Copy appsscript.json to destination,
  copyFilesConfig,
  // 2. Create the server bundle. Don't serve server bundle when running webpack serve.
  serverConfig,
  // 3. Create one client bundle for each client entrypoint.
  ...clientConfigs,
].filter(Boolean);

export default config;