import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { IEnsNameConfig } from '../../src/modules/ensname/EnsNameConfig.js';
import { FakeProvider } from '../stubs/FakeProvider.js';


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
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
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
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
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
    fakeProvider.injectResponse("eth_blockNumber", "0x1206917");
    fakeProvider.injectResponse("eth_call", (payload) => {
      switch(payload.params[0].data.substring(0, 10)) {
        case "0x0178b8bf":
          return "0x0000000000000000000000004976fb03c32e5b8cfe2b6ccb31c09ba78ebaba41";
        case "0x01ffc9a7":
          return "0x0000000000000000000000000000000000000000000000000000000000000001";
        case "0xf1cb7e06":
          return "0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000014332e43696a505ef45b9319973785f837ce5267b9000000000000000000000000";
        default:
          console.log("unknown call: ", payload);
      }
    });
    //fakeProvider.injectResponse("eth_call", "0x0000000000000000000000004b1488b7a6b320d2d721406204abc3eeaa9ad329");
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "pk910.eth",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getTargetAddr()).to.equal("0x332e43696a505ef45b9319973785f837ce5267b9", "unexpected session status");
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
    let error: FaucetError | null = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("REQUIRE_ENSNAME", "unexpected error code");
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
    let error: FaucetError | null = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "test.eth",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("INVALID_ENSNAME", "unexpected error code");
  });


});