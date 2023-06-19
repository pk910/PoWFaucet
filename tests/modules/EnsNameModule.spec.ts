import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from '../common';
import { ServiceManager } from '../../src/common/ServiceManager';
import { FaucetDatabase } from '../../src/db/FaucetDatabase';
import { ModuleManager } from '../../src/modules/ModuleManager';
import { SessionManager } from '../../src/session/SessionManager';
import { faucetConfig } from '../../src/config/FaucetConfig';
import { FaucetError } from '../../src/common/FaucetError';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi';
import { IEnsNameConfig } from '../../src/modules/ensname/EnsNameConfig';
import { FakeProvider } from '../stubs/FakeProvider';


describe("Faucet module: ensname", () => {
  let globalStubs;
  let fakeProvider;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    fakeProvider = new FakeProvider();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
  });
  afterEach(async () => {
    await ServiceManager.GetService(FaucetDatabase).closeDatabase();
    await unbindTestStubs();
    ServiceManager.ClearAllServices();
  });

  it("Check client config exports", async () => {
    faucetConfig.modules["ensname"] = {
      enabled: true,
      rpcHost: fakeProvider,
      ensAddr: null,
      required: true,
    } as IEnsNameConfig;
    fakeProvider.injectResponse("net_version", "5");
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig(null, null);
    expect(!!clientConfig.modules['ensname']).to.equal(true, "no ensname config exported");
    expect(clientConfig.modules['ensname'].required).to.equal(true, "client config missmatch: required");
  });

  it("Start session with optional ENS name", async () => {
    faucetConfig.modules["ensname"] = {
      enabled: true,
      rpcHost: fakeProvider,
      ensAddr: null,
      required: false,
    } as IEnsNameConfig;
    fakeProvider.injectResponse("net_version", "5");
    fakeProvider.injectResponse("eth_call", "0x0000000000000000000000004b1488b7a6b320d2d721406204abc3eeaa9ad329");
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "test.eth",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getTargetAddr()).to.equal("0x4B1488B7a6B320d2D721406204aBc3eeAa9AD329", "unexpected session status");
  });

  it("Start session without required ENS name", async () => {
    faucetConfig.modules["ensname"] = {
      enabled: true,
      rpcHost: fakeProvider,
      ensAddr: null,
      required: true,
    } as IEnsNameConfig;
    fakeProvider.injectResponse("net_version", "5");
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let error: FaucetError = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("REQUIRE_ENSNAME", "unexpected error code");
  });

  it("Start session with invalid ENS name", async () => {
    faucetConfig.modules["ensname"] = {
      enabled: true,
      rpcHost: fakeProvider,
      ensAddr: null,
      required: true,
    } as IEnsNameConfig;
    fakeProvider.injectResponse("net_version", "5");
    fakeProvider.injectResponse("eth_call", "0x0000000000000000000000000000000000000000000000000000000000000000");
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let error: FaucetError = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "test.eth",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("INVALID_ENSNAME", "unexpected error code");
  });


});