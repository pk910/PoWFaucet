import path from 'path';
import webpack from 'webpack';
import wpmerge from 'webpack-merge';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import MinimizerPlugin from "minimizer-webpack-plugin";
import Visualizer from 'webpack-visualizer-plugin2';
import cliArgs from './utils/CliArgs.js';
import pkgJson from './package.json' with { type: 'json' };

var debug = false;
if(cliArgs['dev'])
  debug = true;

var buildTime = (new Date()).getTime();

var webpackModuleConfigs = [
  {
    entry: './src/main',
    output: {
      path: path.join(import.meta.dirname, '/dist'),
      filename: 'powfaucet.js'
    },
    module: {
      rules: [
        {
          test: /\.s?css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'sass-loader',
              options: {
                // don't emit a BOM/@charset in the sass output: it ends up
                // mid-file after bundling and invalidates the first selector
                sassOptions: {
                  charset: false,
                  // Bootstrap 5.3 still uses @import and the global built-ins; neither can change
                  // before Bootstrap 6, so its warnings (quietDeps) and the warnings for our
                  // own @import of it are muted. Everything else still reports.
                  quietDeps: true,
                  silenceDeprecations: ["import"]
                }
              }
            }
          ]
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'powfaucet.css',
        chunkFilename: 'powfaucet.[name].css',

      }),
    ]
  },
  {
    entry: './src/worker/worker-scrypt',
    output: {
      path: path.join(import.meta.dirname, '/dist'),
      filename: 'powfaucet-worker-sc.js',
    },
  },
  {
    entry: './src/worker/worker-cryptonight',
    output: {
      path: path.join(import.meta.dirname, '/dist'),
      filename: 'powfaucet-worker-cn.js',
    },
  },
  {
    entry: './src/worker/worker-argon2',
    output: {
      path: path.join(import.meta.dirname, '/dist'),
      filename: 'powfaucet-worker-a2.js',
    },
  },
  {
    entry: './src/worker/worker-nickminer',
    output: {
      path: path.join(import.meta.dirname, '/dist'),
      filename: 'powfaucet-worker-nm.js',
    },
  },
];

var webpackBaseConfig = {
  mode: debug ? "development" : "production",
  devtool: "source-map",
  // the main bundle (react + bootstrap) and the wasm hasher workers are 400-550 KiB by nature;
  // webpack's 244 KiB hint only adds noise. 1 MiB still flags a runaway bundle.
  performance: {
    maxAssetSize: 1024 * 1024,
    maxEntrypointSize: 1024 * 1024,
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  target: ['web', 'es5'],

  module: {
    rules: [
      // babel-loader to load our jsx and tsx files
      {
        test: /\.(ts|js)x?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ["@babel/preset-env", {
                modules: false
              }],
              // Babel 8 keeps imports that are only used as types unless told otherwise; webpack then
              // warns "export X was not found" for every interface import
              ["@babel/preset-typescript", {
                onlyRemoveTypeImports: false
              }],
              ["@babel/preset-react", {
                development: debug
              }]
            ],
            plugins: [
              "@babel/plugin-transform-class-properties",
              "@babel/plugin-transform-object-rest-spread"
            ]
          },
        },
      }
    ]
  },

  optimization: debug ? undefined : {
    minimize: true,
    minimizer: [
      new MinimizerPlugin({
        parallel: true,
        extractComments: {
          banner: '@pow-faucet-client: ' + JSON.stringify({
            version: pkgJson.version,
            build: buildTime,
          }) + "\n",
        },
        minimizerOptions: {
          compress: true,
          keep_fnames: false,
          mangle: true,
          toplevel: true,
          module: true,
        }
      }),
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
      FAUCET_CLIENT_VERSION: JSON.stringify(pkgJson.version),
      FAUCET_CLIENT_BUILDTIME: buildTime,
    }),
    new Visualizer({
      filename: 'webpack-stats.html'
    })
  ]
};



let finalModuleConfigs = webpackModuleConfigs.map(function(moduleConfig) {
  return wpmerge.merge(webpackBaseConfig, moduleConfig);
});

export default finalModuleConfigs;
