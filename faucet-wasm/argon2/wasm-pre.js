
Module["wasmBinary"] = getWasmBinary();
Module["locateFile"] = function() {};
Module["onRuntimeInitialized"] = function() {
  argon2 = cwrap("hash_a2", "string", ["string", "string", "number", "number", "number", "number", "number", "number"]);
}
