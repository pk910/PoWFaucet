const path = require('path');

module.exports = {
  entry: './src/app.ts',
  target: 'node',
  module: {
    rules: [
      {
        test: /\.ts?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'powfaucet.js',
    path: path.resolve(__dirname, 'dist'),
  }
};
