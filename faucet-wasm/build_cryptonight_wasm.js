
const base32768 = require('base32768');
const fs = require('fs');

const base32768Module = fs.readFileSync("node_modules/base32768/dist/iife/base32768.js", { encoding: "utf8" });
const base32768WASM = base32768.encode(fs.readFileSync("cryptonight-wasm/hash_cn/webassembly/cn.wasm"));

const wasmWrappperJS = fs.readFileSync("cryptonight-wasm/hash_cn/webassembly/cn.js", { encoding: "utf8" });
let lines = wasmWrappperJS.replace(/import\.meta/g, "wasmMeta").split("\n");
// filter out the "export default Module" line
lines = lines.filter(line => !line.startsWith("export default Module"));
const customWASMWrappperJS = lines.join("\n");

// --------------------------------------------------------------------------
// Output the composited webworker JS

// first, include the warning about this file being automatically generated
console.log(`

// THIS FILE IS GENERATED AUTOMATICALLY
// Don't edit this file by hand. 
// Edit the build located in the faucet-wasm folder.

var cryptonightPromise, cryptonight;

module.exports = {
  getCryptoNight: function() { return cryptonight; },
  getCryptoNightReadyPromise: function() { return cryptonightPromise; }
};

function getWasmBinary() {
  ${base32768Module}
  const base32768WASM = "${base32768WASM}";
  return base32768.decode(base32768WASM);
}

(function() {
  var wasmMeta = {};
  ${customWASMWrappperJS}
  cryptonightPromise = Module();
})();

`);
