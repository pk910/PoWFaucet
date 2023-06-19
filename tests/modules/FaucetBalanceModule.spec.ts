import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from '../common';
import { ServiceManager } from '../../src/common/ServiceManager';
import { FaucetDatabase } from '../../src/db/FaucetDatabase';
import { ModuleManager } from '../../src/modules/ModuleManager';
import { SessionManager } from '../../src/session/SessionManager';
import { faucetConfig } from '../../src/config/FaucetConfig';
import { FakeProvider } from '../stubs/FakeProvider';
import { EthWalletManager } from '../../src/eth/EthWalletManager';
import { IFaucetBalanceConfig } from '../../src/modules/faucet-balance/FaucetBalanceConfig';
import { FaucetBalanceModule } from '../../src/modules/faucet-balance/FaucetBalanceModule';


describe("Faucet module: faucet-balance", () => {
  let globalStubs;
  let fakeProvider;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    fakeProvider = new FakeProvider();
    loadDefaultTestConfig();
    faucetConfig.faucetStats = null;
    faucetConfig.ethWalletKey = "feedbeef12340000feedbeef12340000feedbeef12340000feedbeef12340000";
    faucetConfig.ethRpcHost = fakeProvider;
    faucetConfig.spareFundsAmount = 0;
    await ServiceManager.GetService(FaucetDatabase).initialize();
    fakeProvider.injectResponse("eth_chainId", 1337);
    fakeProvider.injectResponse("eth_getBalance", "100000");
    fakeProvider.injectResponse("eth_getTransactionCount", 42);
    await ServiceManager.GetService(EthWalletManager).initialize();
  });
  afterEach(async () => {
    await ServiceManager.GetService(FaucetDatabase).closeDatabase();
    await unbindTestStubs();
    ServiceManager.ClearAllServices();
  });

  it("Start session with static restriction (100%)", async () => {
    faucetConfig.maxDropAmount = 1000;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-balance"] = {
      enabled: true,
      fixedRestriction: {
        99999: 90,
        90000: 50,
      },
      dynamicRestriction: null,
    } as IFaucetBalanceConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(1000n, "unexpected drop amount");
    expect(moduleManager.getModule<FaucetBalanceModule>("faucet-balance").getBalanceRestriction()).to.equal(100, "unexpected balance restriction");
  });

  it("Start session with static restriction (50%)", async () => {
    faucetConfig.maxDropAmount = 1000;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-balance"] = {
      enabled: true,
      fixedRestriction: {
        200000: 90,
        110000: 50,
         90000: 30,
      },
      dynamicRestriction: null,
    } as IFaucetBalanceConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(500n, "unexpected drop amount");
    expect(moduleManager.getModule<FaucetBalanceModule>("faucet-balance").getBalanceRestriction()).to.equal(50, "unexpected balance restriction");
  });

  it("Start session with dynamic restriction (100%)", async () => {
    faucetConfig.maxDropAmount = 1000;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-balance"] = {
      enabled: true,
      fixedRestriction: null,
      dynamicRestriction: {
        targetBalance: 100000
      },
    } as IFaucetBalanceConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(1000n, "unexpected drop amount");
    expect(moduleManager.getModule<FaucetBalanceModule>("faucet-balance").getBalanceRestriction()).to.equal(100, "unexpected balance restriction");
  });

  it("Start session with dynamic restriction (50%)", async () => {
    faucetConfig.maxDropAmount = 1000;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-balance"] = {
      enabled: true,
      fixedRestriction: null,
      dynamicRestriction: {
        targetBalance: 200000
      },
    } as IFaucetBalanceConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(500n, "unexpected drop amount");
    expect(moduleManager.getModule<FaucetBalanceModule>("faucet-balance").getBalanceRestriction()).to.equal(50, "unexpected balance restriction");
  });

  it("Start session with dynamic restriction (0%)", async () => {
    faucetConfig.maxDropAmount = 1000;
    faucetConfig.minDropAmount = 10;
    faucetConfig.spareFundsAmount = 100000;
    faucetConfig.modules["faucet-balance"] = {
      enabled: true,
      fixedRestriction: null,
      dynamicRestriction: {
        targetBalance: 200000
      },
    } as IFaucetBalanceConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("failed", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(0n, "unexpected drop amount");
    expect(moduleManager.getModule<FaucetBalanceModule>("faucet-balance").getBalanceRestriction()).to.equal(0, "unexpected balance restriction");
  });


});