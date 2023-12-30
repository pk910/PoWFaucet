import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { IFaucetOutflowConfig } from '../../src/modules/faucet-outflow/FaucetOutflowConfig.js';
import { FakeProvider } from '../stubs/FakeProvider.js';
import { EthWalletManager } from '../../src/eth/EthWalletManager.js';
import { sleepPromise } from '../../src/utils/SleepPromise.js';
import { FaucetOutflowModule } from '../../src/modules/faucet-outflow/FaucetOutflowModule.js';


describe("Faucet module: faucet-outflow", () => {
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
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  async function runTestSession(expectedStatus?: string): Promise<bigint> {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal(expectedStatus || "claimable", "unexpected session status");
    return testSession.getDropAmount();
  }

  async function awaitTimeSlot() {
    let now = new Date().getTime();
    let millis = now % 1000;
    if(millis < 50)
      return;
    await sleepPromise(1000 - millis + 10);
  }

  it("Start sessions with decreasing drop amount", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-outflow"] = {
      enabled: true,
      amount: 1000,
      duration: 10,
      lowerLimit: -1000,
      upperLimit: 1000,
    } as IFaucetOutflowConfig;
    await awaitTimeSlot();
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 1");
    expect(await runTestSession()).to.equal(90n, "unexpected drop amount: session 2");
    expect(await runTestSession()).to.equal(81n, "unexpected drop amount: session 3");
    await sleepPromise(1000);
    expect((await runTestSession()) <= 82n).to.equal(true, "unexpected drop amount: session 4");
  }).timeout(3000);

  it("Check outflow balance overflow", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-outflow"] = {
      enabled: true,
      amount: 1000,
      duration: 10,
      lowerLimit: -1000,
      upperLimit: 1000,
    } as IFaucetOutflowConfig;
    await awaitTimeSlot();
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let outflowModule = moduleManager.getModule<FaucetOutflowModule>("faucet-outflow");
    (outflowModule as any).outflowState.trackTime -= 20;
    expect(outflowModule.getOutflowDebugState().balance).to.equal("1000", "unexpected outflow balance after 0 sessions");
    for(let i = 0; i < 11; i++) {
      expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session " + (i+1));
      expect(outflowModule.getOutflowDebugState().balance).to.equal((1000 - ((i+1) * 100)).toString(), "unexpected outflow balance after " + (i+1) + " sessions");
    }
    expect(await runTestSession()).to.equal(90n, "unexpected drop amount: session 12");
  }).timeout(3000);

  it("Check outflow balance underflow", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-outflow"] = {
      enabled: true,
      amount: 1000,
      duration: 10,
      lowerLimit: -1000,
      upperLimit: 1000,
    } as IFaucetOutflowConfig;
    await awaitTimeSlot();
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let outflowModule = moduleManager.getModule<FaucetOutflowModule>("faucet-outflow");
    (outflowModule as any).outflowState.trackTime += 10;
    expect(outflowModule.getOutflowDebugState().balance).to.equal("-1000", "unexpected outflow balance after 0 sessions");
    expect(await runTestSession("failed")).to.equal(0n, "unexpected drop amount: session 1");
    await sleepPromise(1000);
    expect(await runTestSession()).to.equal(10n, "unexpected drop amount: session 2");
  }).timeout(3000);

  it("Save & restore outflow state", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["faucet-outflow"] = {
      enabled: true,
      amount: 1000,
      duration: 10,
      lowerLimit: -1000,
      upperLimit: 1000,
    } as IFaucetOutflowConfig;
    await awaitTimeSlot();
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    let outflowModule = moduleManager.getModule<FaucetOutflowModule>("faucet-outflow");
    (outflowModule as any).outflowState.trackTime += 5;
    expect(outflowModule.getOutflowDebugState().balance).to.equal("-500", "unexpected outflow balance after 0 sessions");
    expect(await runTestSession()).to.equal(50n, "unexpected drop amount: session 1");
    await outflowModule.saveOutflowState();
    (outflowModule as any).outflowState = null;
    await outflowModule.loadOutflowState();
    expect(await runTestSession()).to.equal(40n, "unexpected drop amount: session 2");
  }).timeout(3000);

});