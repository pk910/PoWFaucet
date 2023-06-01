import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { unbindTestStubs, FakeProvider } from './common';
import { faucetConfig, loadFaucetConfig } from '../src/common/FaucetConfig';
import { FaucetProcess } from '../src/common/FaucetProcess';
import { EnsResolver } from '../src/services/EnsResolver';
import { ServiceManager } from '../src/common/ServiceManager';

describe("ENS Resolver", () => {
  let globalStubs;
  let fakeProvider;

  beforeEach(() => {
    globalStubs = {
      "FaucetProcess.emitLog": sinon.stub(FaucetProcess.prototype, "emitLog"),
    };
    fakeProvider = new FakeProvider();
    loadFaucetConfig(true);
    faucetConfig.faucetStats = null;
    faucetConfig.ethRpcHost = fakeProvider;
  });
  afterEach(() => {
    return unbindTestStubs();
  });

  it("check ens resolver", async () => {
    faucetConfig.ensResolver = {
      rpcHost: fakeProvider,
      ensAddr: null,
    };
    fakeProvider.injectResponse("net_version", "5");
    fakeProvider.injectResponse("eth_call", "0x0000000000000000000000004b1488b7a6b320d2d721406204abc3eeaa9ad329");
    let ensResolver = new EnsResolver();
    ensResolver.initialize();
    let resolveResult = await ensResolver.resolveEnsName("test.eth");
    expect(resolveResult).equal("0x4B1488B7a6B320d2D721406204aBc3eeAa9AD329", "unexpected address");
  });
  it("check ens resolver (disabled)", async () => {
    faucetConfig.ensResolver = null;
    let ensResolver = new EnsResolver();
    ensResolver.initialize();
    let exception;
    try {
      await ensResolver.resolveEnsName("test.eth");
    } catch(ex) {
      exception = ex;
    }
    expect(exception).equal("ENS resolver not enabled", "unexpected error");
  });
  it("check ens resolver (dynamic enable/disable)", async () => {
    faucetConfig.ensResolver = null;
    let ensResolver = new EnsResolver();
    ensResolver.initialize();
    let exception;
    try {
      await ensResolver.resolveEnsName("test.eth");
    } catch(ex) {
      exception = ex;
    }
    expect(exception).equal("ENS resolver not enabled", "unexpected error");
    faucetConfig.ensResolver = {
      rpcHost: fakeProvider,
      ensAddr: null,
    };
    fakeProvider.injectResponse("net_version", "5");
    fakeProvider.injectResponse("eth_call", "0x0000000000000000000000004b1488b7a6b320d2d721406204abc3eeaa9ad329");
    ServiceManager.GetService(FaucetProcess).emit("reload");
    let resolveResult = await ensResolver.resolveEnsName("test.eth");
    expect(resolveResult).equal("0x4B1488B7a6B320d2D721406204aBc3eeAa9AD329", "unexpected address");
  });

});
