
const base32768 = require('base32768');
const fs = require('fs');
 
const base32768WASM = base32768.encode(fs.readFileSync("node_modules/@spruceid/didkit-wasm/node/didkit_wasm_bg.wasm"));

const wasmWrappperJS = fs.readFileSync("node_modules/@spruceid/didkit-wasm/node/didkit_wasm.js", { encoding: "utf8" });
let wasmWrappperLines = wasmWrappperJS.split("\n");

const customLoaderSrc = [
  fs.readFileSync("node_modules/base32768/dist/iife/base32768.js", { encoding: "utf8" }),
  `const base32768WASM = "${base32768WASM}";`,
  `const bytes = base32768.decode(base32768WASM);`
];

// inject wasm binary

/*
const path = require('path').join(__dirname, 'didkit_wasm_bg.wasm');
const bytes = require('fs').readFileSync(path);
*/

wasmWrappperLines = wasmWrappperLines.map(line => {
  if(line.startsWith("const path") && line.match(/didkit_wasm_bg\.wasm/)) {
    return "";
  }
  if(line.startsWith("const bytes = require('fs').readFileSync(path);")) {
    return customLoaderSrc.join("\n");
  }
  return line;
});

// --------------------------------------------------------------------------
// Output the composited library

const librarySrc = [];
librarySrc.push(`

// THIS FILE IS GENERATED AUTOMATICALLY
// Don't edit this file by hand. 
// Edit the build located in the faucet-wasm folder.

`);
librarySrc.push(wasmWrappperLines.join("\n"));

fs.writeFileSync("../../libs/didkit_wasm.cjs", librarySrc.join("\n"));
