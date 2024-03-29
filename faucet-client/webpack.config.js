const path = require('path');

module.exports = {
  mode: 'production',
  entry: {
    index: './src/index.ts',
    "worker-scrypt": './src/worker/worker-scrypt.ts',
    "worker-cryptonight": './src/worker/worker-cryptonight.ts',
    "worker-argon2": './src/worker/worker-argon2.ts',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js', // Output filename based on entry point name
    library: '[name]', // Library name based on entry point name
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  externals: {
    react: 'react',
  },
};
