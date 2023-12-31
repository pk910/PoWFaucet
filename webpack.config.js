import path, { dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from "url";
import webpack from "webpack";

let importUrl = fileURLToPath(import.meta.url);
const basedir = dirname(importUrl);

let packageJson = JSON.parse(fs.readFileSync(path.join(basedir, "package.json"), 'utf8'));

export default {
  entry: './dist/app.js',
  target: 'node',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'powfaucet.cjs',
    path: path.resolve(basedir, 'bundle'),
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
    new webpack.DefinePlugin({
      POWFAUCET_VERSION: JSON.stringify(packageJson.version),
    }),
  ],
};
