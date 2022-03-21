const path = require('path');
const webpack = require('webpack');
const wpmerge = require('webpack-merge');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require("terser-webpack-plugin");
var cliArgs = require('./utils/CliArgs');

var debug = false;
if(cliArgs['dev'])
  debug = true;

var webpackModuleConfigs = [
  {
    entry: './src/main',
    output: {
      path: path.join(__dirname, '/dist'),
      filename: 'powcaptcha.js'
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [MiniCssExtractPlugin.loader, 'css-loader']
        }
      ]
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: 'powcaptcha.css',
        chunkFilename: 'powcaptcha.[name].css',

      }),
    ]
  },
  {
    entry: './src/worker',
    output: {
      path: path.join(__dirname, '/dist'),
      filename: 'powcaptcha-worker.js',
    },

  },
];

var webpackBaseConfig = {
  mode: debug ? "development" : "production",
  devtool: debug ? "source-map" : undefined,

  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },

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
              "@babel/preset-env",
              "@babel/preset-typescript",
              "@babel/preset-react"
            ],
            plugins: [
              "@babel/syntax-dynamic-import",
              "@babel/proposal-class-properties",
              "@babel/proposal-object-rest-spread",
              "@babel/plugin-syntax-flow"
            ]
          },
        },
      },

      // url-loader to bundle images & fonts
      {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
        loader: 'url-loader',
        options: {
          limit: 10000
        }
      }
    ]
  },

  optimization: debug ? undefined : {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,
        extractComments: true,
        terserOptions: {
          mangle: true,
          toplevel: true,
          module: true,
        }
      }),
    ],
  },

  plugins: [
    new webpack.DefinePlugin({
        'process.env': {
            
        }
    })
  ]
};



module.exports = webpackModuleConfigs.map(function(moduleConfig) {
  return wpmerge.merge(webpackBaseConfig, moduleConfig);
});
