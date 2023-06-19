import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from '../common';
import { ServiceManager } from '../../src/common/ServiceManager';
import { FaucetDatabase } from '../../src/db/FaucetDatabase';
import { ModuleHookAction, ModuleManager } from '../../src/modules/ModuleManager';
import { SessionManager } from '../../src/session/SessionManager';
import { faucetConfig } from '../../src/config/FaucetConfig';
import { IRecurringLimitsConfig } from '../../src/modules/recurring-limits/RecurringLimitsConfig';
import { FaucetError } from '../../src/common/FaucetError';
import { IConcurrencyLimitConfig } from '../../src/modules/concurrency-limit/ConcurrencyLimitConfig';
import { FaucetSession } from '../../src/session/FaucetSession';


describe("Faucet module: concurrency-limit", () => {
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

  async function runTestSession(ip: string, addr: string, expectedStatus?: string): Promise<FaucetSession> {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession(ip, {
      addr: addr,
    });
    if(expectedStatus)
      expect(testSession.getSessionStatus()).to.equal(expectedStatus, "unexpected session status");
    return testSession;
  }

  it("Exceed limit by ip", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["concurrency-limit"] = {
      enabled: true,
      concurrencyLimit: 1,
      byIPOnly: true,
      messageByIP: "test-error-message",
    } as IConcurrencyLimitConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    await runTestSession("8.8.8.8", "0x0000000000000000000000000000000000001337", "running");
    let error: FaucetError = null;
    try {
      await runTestSession("8.8.8.8", "0x0000000000000000000000000000000000001338");
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("CONCURRENCY_LIMIT", "unexpected error code");
    expect(error.message).to.matches(/test-error-message/, "unexpected error message");
  });

  it("Exceed limit by addr", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["concurrency-limit"] = {
      enabled: true,
      concurrencyLimit: 1,
      byAddrOnly: true,
      messageByAddr: "test-error-message",
    } as IConcurrencyLimitConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    await runTestSession("8.8.8.8", "0x0000000000000000000000000000000000001337", "running");
    let error: FaucetError = null;
    try {
      await runTestSession("8.8.8.8", "0x0000000000000000000000000000000000001337");
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("CONCURRENCY_LIMIT", "unexpected error code");
    expect(error.message).to.matches(/test-error-message/, "unexpected error message");
  });

  it("Exceed limit by addr or ip", async () => {
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["concurrency-limit"] = {
      enabled: true,
      concurrencyLimit: 1,
      byAddrOnly: true,
      messageByIP: "test-error-message",
      messageByAddr: "test-error-message",
    } as IConcurrencyLimitConfig;
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    await runTestSession("8.8.8.8", "0x0000000000000000000000000000000000001337", "running");
    await runTestSession("8.8.4.4", "0x0000000000000000000000000000000000001338", "running");
    let error: FaucetError = null;
    try {
      await runTestSession("8.8.8.8", "0x0000000000000000000000000000000000001338");
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("CONCURRENCY_LIMIT", "unexpected error code");
    expect(error.message).to.matches(/test-error-message/, "unexpected error message");
  });

});