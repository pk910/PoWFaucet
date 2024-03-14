const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = [
  {
    entry: './lib.js',
    target: 'node',
    mode: 'production',
    resolve: {
      extensions: ['.js'],
    },
    output: {
      filename: 'groth16.cjs',
      path: __dirname + '/dist',
      library: 'libpack',
      libraryTarget:'umd'
    },
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    optimization: {
      minimize: true,
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          terserOptions: {
            format: {
              comments: false,
            },
          },
        }),
      ],
    },
  }
];
