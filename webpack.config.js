import path, { dirname } from 'path'
import { fileURLToPath } from "url";
import webpack from "webpack";

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
    path: path.resolve(__dirname, 'bundle'),
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1,
    }),
  ],
};
