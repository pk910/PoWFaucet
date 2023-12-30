import path, { dirname } from 'path'
import { fileURLToPath } from "url";

let importUrl = fileURLToPath(import.meta.url);
const __dirname = dirname(importUrl);

export default {
  entry: './dist/app.js',
  target: 'node',
  resolve: {
    extensions: ['.ts', '.js'],
  },
  output: {
    filename: 'powfaucet.cjs',
    chunkFilename: 'powfaucet-[name].cjs',
    path: path.resolve(__dirname, 'bundle'),
    libraryTarget: 'umd',
  }
};
