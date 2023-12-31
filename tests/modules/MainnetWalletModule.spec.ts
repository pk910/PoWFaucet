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
import { FakeProvider } from '../stubs/FakeProvider.js';
import { IMainnetWalletConfig } from '../../src/modules/mainnet-wallet/MainnetWalletConfig.js';


describe("Faucet module: mainnet-wallet", () => {
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

  it("Start session with passing mainnet txcount & balance check", async () => {
    faucetConfig.modules["mainnet-wallet"] = {
      enabled: true,
      rpcHost: fakeProvider,
      minTxCount: 10,
      minBalance: 1000,
    } as IMainnetWalletConfig;
    fakeProvider.injectResponse("eth_getBalance", "1000");
    fakeProvider.injectResponse("eth_getTransactionCount", "0xa");
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    let balanceReq = fakeProvider.getLastRequest("eth_getBalance");
    expect(balanceReq).to.not.equal(null, "no eth_getBalance request");
    expect(balanceReq.params[0]).to.equal("0x0000000000000000000000000000000000001337", "unexpected target address in eth_getBalance request");
    let txcountReq = fakeProvider.getLastRequest("eth_getTransactionCount");
    expect(txcountReq).to.not.equal(null, "no eth_getTransactionCount request");
    expect(txcountReq.params[0]).to.equal("0x0000000000000000000000000000000000001337", "unexpected target address in eth_getCode request");
  });

  it("Start session with too low mainnet balance", async () => {
    faucetConfig.modules["mainnet-wallet"] = {
      enabled: true,
      rpcHost: fakeProvider,
      minTxCount: 0,
      minBalance: 1000,
    } as IMainnetWalletConfig;
    fakeProvider.injectResponse("eth_getBalance", "999");
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
    expect(error?.getCode()).to.equal("MAINNET_BALANCE_LIMIT", "unexpected error code");
  });

  it("Start session with too low mainnet txcount", async () => {
    faucetConfig.modules["mainnet-wallet"] = {
      enabled: true,
      rpcHost: fakeProvider,
      minTxCount: 10,
      minBalance: 0,
    } as IMainnetWalletConfig;
    fakeProvider.injectResponse("eth_getTransactionCount", "0x5");
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
    expect(error?.getCode()).to.equal("MAINNET_TXCOUNT_LIMIT", "unexpected error code");
  });

});