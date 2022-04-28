
Module["wasmBinary"] = getWasmBinary();
Module["locateFile"] = function() {};
Module["onRuntimeInitialized"] = function() {
  cryptonight = cwrap('hash_cn', 'string', ['string','number','number','number']);
}
