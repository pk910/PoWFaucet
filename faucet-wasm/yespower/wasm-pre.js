// the wasm binary is embedded in libs/yespower_wasm.cjs and handed in by the loader (see build_wasm.js)
Module["wasmBinary"] = Module["yespowerWasmBinary"];
Module["locateFile"] = function() {};
