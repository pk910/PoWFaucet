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
import { FakeProvider } from '../stubs/FakeProvider';
import { IEthInfoConfig } from '../../src/modules/ethinfo/EthInfoConfig';
import { EthWalletManager } from '../../src/eth/EthWalletManager';


describe("Faucet module: ethinfo", () => {
  let globalStubs;
  let fakeProvider;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    fakeProvider = new FakeProvider();
    loadDefaultTestConfig();
    faucetConfig.faucetStats = null;
    faucetConfig.ethWalletKey = "feedbeef12340000feedbeef12340000feedbeef12340000feedbeef12340000";
    faucetConfig.ethRpcHost = fakeProvider;
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

  it("Start session with passing balance & contract check", async () => {
    faucetConfig.modules["ethinfo"] = {
      enabled: true,
      maxBalance: 1000,
      denyContract: true,
    } as IEthInfoConfig;
    fakeProvider.injectResponse("eth_getBalance", "1000");
    fakeProvider.injectResponse("eth_getCode", "0x");
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    let balanceReq = fakeProvider.getLastRequest("eth_getBalance");
    expect(balanceReq).to.not.equal(null, "no eth_getBalance request");
    expect(balanceReq.params[0]).to.equal("0x0000000000000000000000000000000000001337", "unexpected target address in eth_getBalance request");
    let codeReq = fakeProvider.getLastRequest("eth_getCode");
    expect(codeReq).to.not.equal(null, "no eth_getCode request");
    expect(codeReq.params[0]).to.equal("0x0000000000000000000000000000000000001337", "unexpected target address in eth_getCode request");
  });

  it("Start session with too high balance", async () => {
    faucetConfig.modules["ethinfo"] = {
      enabled: true,
      maxBalance: 1000,
      denyContract: true,
    } as IEthInfoConfig;
    fakeProvider.injectResponse("eth_getBalance", "1001");
    fakeProvider.injectResponse("eth_getCode", "0x");
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
    expect(error.getCode()).to.equal("BALANCE_LIMIT", "unexpected error code");
  });

  it("Start session for contract", async () => {
    faucetConfig.modules["ethinfo"] = {
      enabled: true,
      maxBalance: 1000,
      denyContract: true,
    } as IEthInfoConfig;
    fakeProvider.injectResponse("eth_getBalance", "1000");
    fakeProvider.injectResponse("eth_getCode", "0x12345678");
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
    expect(error.getCode()).to.equal("CONTRACT_ADDR", "unexpected error code");
  });

});