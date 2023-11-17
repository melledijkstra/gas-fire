/*********************************
 *    import webpack plugins
 ********************************/
const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const GasPlugin = require('gas-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackInlineSourcePlugin = require('@effortlessmotion/html-webpack-inline-source-plugin');
const DynamicCdnWebpackPlugin = require('@effortlessmotion/dynamic-cdn-webpack-plugin');
const moduleToCdn = require('module-to-cdn');

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
// IF UPDATE HERE, ALSO UPDATE 'server/ui.ts' !
const clientEntrypoints = [
  {
    name: 'CLIENT - About Dialog',
    entry: './src/client/about-dialog/index.tsx',
    filename: 'about-dialog', // we'll add the .html suffix to these
    template: './src/client/about-dialog/index.html',
  },
  {
    name: 'CLIENT - Import Dialog',
    entry: './src/client/import-dialog/index.tsx',
    filename: 'import-dialog', // we'll add the .html suffix to these
    template: './src/client/import-dialog/index.html',
  },
  {
    name: 'CLIENT - Settings Dialog',
    entry: './src/client/settings-dialog/index.tsx',
    filename: 'settings-dialog', // we'll add the .html suffix to these
    template: './src/client/settings-dialog/index.html',
  },
];

/*********************************
 *    Declare settings
 ********************************/

// webpack settings for copying files to the destination folder
const copyFilesConfig = {
  name: 'COPY FILES - appsscript.json',
  mode: 'production', // unnecessary for this config, but removes console warning
  entry: copyAppscriptEntry,
  output: {
    path: destination,
    publicPath,
  },
  plugins: [
    new CopyWebpackPlugin({
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
const sharedClientAndServerConfig = {
  context: __dirname,
};

// webpack settings used by all client entrypoints
const clientConfig = () => ({
  ...sharedClientAndServerConfig,
  mode: isProd ? 'production' : 'development',
  output: {
    path: destination,
    // this file will get added to the html template inline
    // and should be put in .claspignore so it is not pushed
    filename: 'main.js',
    publicPath,
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
});

// DynamicCdnWebpackPlugin settings
// these settings help us load 'react', 'react-dom' and the packages defined below from a CDN
// see https://github.com/enuchi/React-Google-Apps-Script#adding-new-libraries-and-packages
const DynamicCdnWebpackPluginConfig = {
  // set "verbose" to true to print console logs on CDN usage while webpack builds
  verbose: false,
  resolver: (packageName, packageVersion, options) => {
    const packageSuffix = isProd ? '.min.js' : '.js';
    const moduleDetails = moduleToCdn(packageName, packageVersion, options);

    // don't externalize react during development due to issue with react-refresh
    // https://github.com/pmmmwh/react-refresh-webpack-plugin/issues/334
    if (!isProd && packageName === 'react') {
      return null;
    }

    // define custom CDN configuration for new packages
    // "name" should match the package being imported
    // "var" is important to get right -- this should be the exposed global. Look up "webpack externals" for info.
    switch (packageName) {
      case 'react-transition-group':
        return {
          name: packageName,
          var: 'ReactTransitionGroup',
          version: packageVersion,
          url: `https://unpkg.com/react-transition-group@${packageVersion}/dist/react-transition-group${packageSuffix}`,
        };
      case '@mui/material':
        return {
          name: packageName,
          var: 'MaterialUI',
          version: packageVersion,
          url: `https://unpkg.com/@mui/material@${packageVersion}/umd/material-ui.${
            isProd ? 'production.min.js' : 'development.js'
          }`,
        };
      case '@emotion/react':
        return {
          name: packageName,
          var: 'emotionReact',
          version: packageVersion,
          url: `https://unpkg.com/@emotion/react@${packageVersion}/dist/emotion-react.umd.min.js`,
        };
      case '@emotion/styled':
        return {
          name: packageName,
          var: 'emotionStyled',
          version: packageVersion,
          url: `https://unpkg.com/@emotion/styled@${packageVersion}/dist/emotion-styled.umd.min.js`,
        };
      case 'tabulator-tables':
        return {
          name: packageName,
          var: 'Tabulator',
          version: packageVersion,
          url: `https://unpkg.com/tabulator-tables@${packageVersion}/dist/js/tabulator.min.js`,
        };
      case 'papaparse': {
        return {
          name: packageName,
          var: 'Papa',
          version: packageVersion,
          url: `https://unpkg.com/papaparse@${packageVersion}/papaparse.min.js`,
        };
      }
      // externalize gas-client to keep bundle size even smaller
      case 'gas-client':
        return {
          name: packageName,
          var: 'GASClient',
          version: packageVersion,
          url: `https://unpkg.com/gas-client@${packageVersion}/dist/index.js`,
        };
      // must include peer dependencies for any custom imports
      case '@types/react':
        return {
          name: packageName,
          var: '@types/react',
          version: packageVersion,
          url: `https://unpkg.com/@types/react@${packageVersion}/index.d.ts`,
        };
      // return defaults/null depending if Dynamic CDN plugin finds package
      default:
        return moduleDetails;
    }
  },
};

// webpack settings used by each client entrypoint defined at top
const clientConfigs = clientEntrypoints.map((clientEntrypoint) => {
  return {
    ...clientConfig(),
    name: clientEntrypoint.name,
    entry: clientEntrypoint.entry,
    plugins: [
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(envVars),
      }),
      new HtmlWebpackPlugin({
        template: clientEntrypoint.template,
        filename: `${clientEntrypoint.filename}${isProd ? '' : '-impl'}.html`,
        inlineSource: '^/.*(js|css)$', // embed all js and css inline, exclude packages from dynamic cdn insertion
        scriptLoading: 'blocking',
        inject: 'body',
      }),
      // add the generated js code to the html file inline
      new HtmlWebpackInlineSourcePlugin(),
      // this plugin allows us to add dynamically load packages from a CDN
      new DynamicCdnWebpackPlugin(DynamicCdnWebpackPluginConfig),
    ].filter(Boolean),
  };
});

// webpack settings used by the server-side code
const serverConfig = {
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
    minimize: true,
  },
  plugins: [
    new GasPlugin({
      // removes need for assigning public server functions to "global"
      autoGlobalExportsFiles: [serverEntry],
    }),
  ],
};

module.exports = [
  // 1. Copy appsscript.json to destination,
  { ...copyFilesConfig },
  // 2. Create the server bundle. Don't serve server bundle when running webpack serve.
  serverConfig,
  // 3. Create one client bundle for each client entrypoint.
  ...clientConfigs,
].filter(Boolean);
