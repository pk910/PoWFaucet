const path = require('path');
const url = require('url');
const webpack = require('webpack');

const basedir = __dirname;
console.log(basedir);

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
      path: path.resolve(basedir, '..', '..', 'libs'),
      library: 'libpack',
      libraryTarget:'umd'
    },
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    optimization: {
      minimize: false
    },
  }
];
