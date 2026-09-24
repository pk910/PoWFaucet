/**
 * The smallest module that exercises the loader end to end.
 *
 * Deliberately plain CommonJS with no build step and no dependency on the faucet's source:
 * a real module is compiled elsewhere and the faucet must load it as-is. If this file had
 * to be compiled by the faucet's own tsconfig it would prove nothing about a module that
 * is not in this repository.
 *
 * It records what `init` was handed so the test can assert the SDK is the live thing
 * rather than a copy.
 */

const seen = {
  initCalls: 0,
  faucetVersion: null,
  apiVersion: null,
  moduleDir: null,
  binary: null,
  logged: [],
};

class EchoModule {
  constructor(manager, name) {
    this.manager = manager;
    this.name = name;
  }
  getModuleName() { return this.name; }
}

/**
 * A worker that says it is alive, because "it registered" is not the same as "a child can be it".
 *
 * The child spawned for a module's worker is a fresh process that loads no modules, so the only
 * evidence that the whole path works is a message from inside that process. Before the loader nothing
 * asked for one and the faucet shipped a worker key no child could resolve.
 */
class EchoWorker {
  constructor(port) {
    this.port = port;
    let hello = { action: "echo-worker", pid: process.pid };
    if(port && port.postMessage)
      port.postMessage(hello);
    else if(process.send)
      process.send(hello);
  }
}

module.exports = {
  EchoModule: EchoModule,
  EchoWorker: EchoWorker,
  /** what the loader saw, for the test */
  __seen: seen,

  async init(sdk) {
    seen.initCalls++;
    seen.faucetVersion = sdk.faucetVersion;
    seen.apiVersion = sdk.apiVersion;
    seen.moduleDir = sdk.moduleDir;
    sdk.log("info", "echo module initialised");
    seen.logged.push("init");
  },
};
