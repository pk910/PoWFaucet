import { encode } from "base32768";
import fs from "fs";

// Composes libs/yespower_wasm.cjs: both wasm variants embedded as base32768 text, their emscripten
// loaders, and a small selector that picks the SIMD variant when the engine can compile it.

const variants = ["simd", "baseline"];

const base32768Module = fs.readFileSync("node_modules/base32768/src/index.js", { encoding: "utf8" }).replace(/^export .*$/m, "");

const wasmBinaries = {};
const loaderSources = [];
for (const variant of variants) {
  wasmBinaries[variant] = encode(fs.readFileSync("build/hash_yp_" + variant + ".wasm"));
  const loader = fs.readFileSync("build/hash_yp_" + variant + ".js", { encoding: "utf8" })
    .replace(/import\.meta/g, "wasmMeta")
    .split("\n")
    .filter((line) => !line.startsWith("export default "))
    .join("\n");
  loaderSources.push(loader);
}

console.log(`

// THIS FILE IS GENERATED AUTOMATICALLY
// Don't edit this file by hand.
// Edit the build located in the faucet-wasm/yespower folder.

var yespowerPromise, yespower, yespowerVariant;
var yespowerFactories = {};
var yespowerBinaryCache = {};

module.exports = {
  getYespower: function() { return yespower; },
  getYespowerReadyPromise: function() { return yespowerPromise; },
  getYespowerVariant: function() { return yespowerVariant; },
  loadYespowerVariant: function(variant) { return loadYespowerVariant(variant); }
};

function decodeYespowerBinary(text) {
  ${base32768Module}
  return decode(text);
}

function getYespowerBinary(variant) {
  if(!yespowerBinaryCache[variant]) {
    switch(variant) {
      case "simd":
        yespowerBinaryCache[variant] = decodeYespowerBinary("${wasmBinaries.simd}");
        break;
      case "baseline":
        yespowerBinaryCache[variant] = decodeYespowerBinary("${wasmBinaries.baseline}");
        break;
      default:
        throw new Error("unknown yespower variant: " + variant);
    }
  }
  return yespowerBinaryCache[variant];
}

(function() {
  var wasmMeta = {};
  if(typeof self === "undefined") {
    var self = {location:{href:""}};
  }

  ${loaderSources.join("\n\n")}

  yespowerFactories["simd"] = YespowerModule_simd;
  yespowerFactories["baseline"] = YespowerModule_baseline;
})();

function loadYespowerVariant(variant) {
  var factory = yespowerFactories[variant];
  if(!factory)
    return Promise.reject(new Error("unknown yespower variant: " + variant));
  return factory({ yespowerWasmBinary: getYespowerBinary(variant) }).then(function(instance) {
    return instance.cwrap("hash_yp", "string", ["string", "number", "number", "string"]);
  });
}

function selectYespowerVariant() {
  try {
    if(WebAssembly.validate(getYespowerBinary("simd")))
      return "simd";
  } catch(ex) {}
  return "baseline";
}

yespowerVariant = selectYespowerVariant();
yespowerPromise = loadYespowerVariant(yespowerVariant).then(function(hashFn) {
  yespower = hashFn;
});

`);
