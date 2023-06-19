import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from '../common';
import { ServiceManager } from '../../src/common/ServiceManager';
import { FaucetDatabase } from '../../src/db/FaucetDatabase';
import { ModuleManager } from '../../src/modules/ModuleManager';
import { SessionManager } from '../../src/session/SessionManager';
import { faucetConfig } from '../../src/config/FaucetConfig';
import { IRecurringLimitsConfig } from '../../src/modules/recurring-limits/RecurringLimitsConfig';
import { FaucetError } from '../../src/common/FaucetError';


describe("Faucet module: recurring-limits", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
  });
  afterEach(async () => {
    await ServiceManager.GetService(FaucetDatabase).closeDatabase();
    await unbindTestStubs();
    ServiceManager.ClearAllServices();
  });

  async function runTestSession(expectedStatus?: string): Promise<bigint> {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal(expectedStatus || "claimable", "unexpected session status");
    return testSession.getDropAmount();
  }

  it("Exceed limit by ip (session count)", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["recurring-limits"] = {
      enabled: true,
      limits: [
        {
          duration: 30,
          limitCount: 2,
          byIPOnly: true,
        }
      ]
    } as IRecurringLimitsConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 1");
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 2");
    let error: FaucetError = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("RECURRING_LIMIT", "unexpected error code");
  });

  it("Exceed limit by addr (session amount)", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["recurring-limits"] = {
      enabled: true,
      limits: [
        {
          duration: 30,
          limitAmount: 200,
          byAddrOnly: true,
        }
      ]
    } as IRecurringLimitsConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 1");
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 2");
    let error: FaucetError = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("8.8.4.4", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("RECURRING_LIMIT", "unexpected error code");
  });

  it("Exceed limit by ip & addr (session count)", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["recurring-limits"] = {
      enabled: true,
      limits: [
        {
          duration: 30,
          limitCount: 2,
        }
      ]
    } as IRecurringLimitsConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 1");
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 2");
    let error: FaucetError = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("RECURRING_LIMIT", "unexpected error code");
  });


});