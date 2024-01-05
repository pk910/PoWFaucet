
import { encode } from "base32768";
import fs from "fs";

const base32768Module = fs.readFileSync("node_modules/base32768/src/index.js", { encoding: "utf8" }).replace(/^export .*$/m, "");
const base32768WASM = encode(fs.readFileSync("hash_a2.wasm"));

const wasmWrappperJS = fs.readFileSync("hash_a2.js", { encoding: "utf8" });
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

var argon2Promise, argon2;

module.exports = {
  getArgon2: function() { return argon2; },
  getArgon2ReadyPromise: function() { return argon2Promise; }
};

function getWasmBinary() {
  ${base32768Module}
  const base32768WASM = "${base32768WASM}";
  return decode(base32768WASM);
}

(function() {
  var wasmMeta = {};
  if(typeof self === "undefined") {
    var self = {location:{href:""}};
  }

  ${customWASMWrappperJS}
  argon2Promise = Module();
})();

`);
