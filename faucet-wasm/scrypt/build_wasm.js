
const base32768 = require('base32768');
const fs = require('fs');
 
const base32768WASM = base32768.encode(fs.readFileSync("scrypt-wasm/pkg/scrypt_wasm_bg.wasm"));

const wasmWrappperJS = fs.readFileSync("scrypt-wasm/pkg/scrypt_wasm_bg.js", { encoding: "utf8" });
let lines = wasmWrappperJS.split("\n");

// filter out the first line "import * as wasm from './scrypt_wasm_bg.wasm';"
// because we are using global namespace, not es6 modules
lines = lines.filter(line => !line.includes("scrypt_wasm_bg.wasm"))

// replace export with global namespace for the same reason.
lines = lines.map(line => {
  if(line.startsWith("export function scrypt")) {
    return line.replace("export function scrypt", "scrypt = function");
  }
  else if(line.startsWith("export function")) {
    return line.replace("export function", "function");
  }
  return line;
});
const customWASMWrappperJS = lines.join("\n");

// --------------------------------------------------------------------------
// Output the composited webworker JS

// first, include the warning about this file being automatically generated
console.log(`

// THIS FILE IS GENERATED AUTOMATICALLY
// Don't edit this file by hand. 
// Edit the build located in the faucet-wasm folder.

let scrypt;
let scryptPromise;

module.exports = {
  getScrypt: function() { return scrypt; },
  getScryptReadyPromise: function() { return scryptPromise; }
};

`);

// Now its time to load the wasm module. 
// first, load the base32768 module into a global variable called "base32768"
console.log(fs.readFileSync("node_modules/base32768/dist/iife/base32768.js", { encoding: "utf8" }))

// now, decode the base32768 string into an ArrayBuffer and tell WebAssembly to load it
console.log(`
const base32768WASM = "${base32768WASM}";

const wasmBinary = base32768.decode(base32768WASM);

scryptPromise = WebAssembly.instantiate(wasmBinary, {}).then(instantiatedModule => {
`);

// Output the WASM wrapper JS code that came from the Rust WASM compiler, 
// slightly modified to use global namespace instead of es6 modules
console.log(customWASMWrappperJS.split("\n").map(x => `  ${x}`).join("\n"));

console.log("__wbg_set_wasm(instantiatedModule.instance.exports);");
// finish off by closing scryptPromise
console.log("});");