
Module["wasmBinary"] = getWasmBinary();
Module["locateFile"] = function() {};
Module["onRuntimeInitialized"] = function() {
  onWasmReady(Module, {
    ccall: ccall,
    cwrap: cwrap
  });
}
