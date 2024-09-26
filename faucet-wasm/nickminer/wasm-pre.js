
Module["wasmBinary"] = getWasmBinary();
Module["locateFile"] = function() {};
Module["onRuntimeInitialized"] = function() {
  nickMiner = {
    miner_init: cwrap("miner_init", "void", []),
    miner_set_config: cwrap("miner_set_config", "void", ["string", "string", "number", "string", "string", "number", "string"]),
    miner_get_input: cwrap("miner_get_input", "string", []),
    miner_get_sigrv: cwrap("miner_get_sigrv", "string", []),
    miner_get_suffix: cwrap("miner_get_suffix", "string", []),
    miner_get_preimage: cwrap("miner_get_preimage", "string", []),
    miner_run: cwrap("miner_run", "string", ["string"]),

  };
}
