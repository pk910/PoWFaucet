import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from './common';
import { ServiceManager } from '../src/common/ServiceManager';
import { FaucetDatabase } from '../src/db/FaucetDatabase';
import { ModuleHookAction, ModuleManager } from '../src/modules/ModuleManager';
import { SessionManager } from '../src/session/SessionManager';
import { faucetConfig } from '../src/config/FaucetConfig';
import { FaucetError } from '../src/common/FaucetError';
import { FaucetSession, FaucetSessionStatus } from '../src/session/FaucetSession';


describe("Faucet Session Management", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    await ServiceManager.GetService(ModuleManager).initialize();
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  it("Create normal session", async () => {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let now = Math.floor(new Date().getTime() / 1000);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    expect(testSession).to.not.equal(null, "createSession failed");
    expect(testSession.getRemoteIP()).to.equal("8.8.8.8", "unexpected remoteIP");
    expect(testSession.getTargetAddr()).to.equal("0x0000000000000000000000000000000000001337", "unexpected targetAddr");
    expect(Math.abs(testSession.getStartTime() - now)).to.be.lessThan(2, "unexpected startTime");
    expect(testSession.getBlockingTasks().length).to.equal(0, "unexpected blockingTasks");
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(BigInt(faucetConfig.maxDropAmount), "unexpected drop amount");
  });

  it("Create invalid session (missing addr)", async () => {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let error: FaucetError = null;
    try {
      await sessionManager.createSession("8.8.8.8", { });
    } catch(ex) { error = ex; }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("INVALID_ADDR", "unexpected error code");
  });

  it("Create invalid session (invalid addr)", async () => {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let error: FaucetError = null;
    try {
      await sessionManager.createSession("8.8.8.8", { addr: "not_a_eth_address" });
    } catch(ex) { error = ex; }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error.getCode()).to.equal("INVALID_ADDR", "unexpected error code");
  });

  it("Create session with blocking task", async () => {
    faucetConfig.minDropAmount = 1000;
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let now = Math.floor(new Date().getTime() / 1000);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    expect(testSession).to.not.equal(null, "createSession failed");
    expect(testSession.getRemoteIP()).to.equal("8.8.8.8", "unexpected remoteIP");
    expect(testSession.getTargetAddr()).to.equal("0x0000000000000000000000000000000000001337", "unexpected targetAddr");
    expect(Math.abs(testSession.getStartTime() - now)).to.be.lessThan(2, "unexpected startTime");
    expect(testSession.getBlockingTasks().length).to.equal(1, "unexpected blockingTasks");
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.RUNNING, "unexpected session status");
    await testSession.addReward(1337n);
    expect(testSession.getDropAmount()).to.equal(1337n, "unexpected drop amount after addReward()");
    await testSession.subPenalty(10n);
    expect(testSession.getDropAmount()).to.equal(1327n, "unexpected drop amount after subPenalty()");
    let runningSession = sessionManager.getSession(testSession.getSessionId(), [FaucetSessionStatus.RUNNING]);
    expect(runningSession === testSession).to.equal(true, "sessionManager.getSession did not return running session (running state)");
    let runningSession2 = sessionManager.getSession(testSession.getSessionId());
    expect(runningSession2 === testSession).to.equal(true, "sessionManager.getSession did not return running session (stateless)");
    await awaitSleepPromise(4000, () => testSession.getSessionStatus() === FaucetSessionStatus.CLAIMABLE);
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");
    testSession.setDropAmount(42n); // this may not work anymore as the balance is already set
    expect(testSession.getDropAmount()).to.equal(1327n, "unexpected drop amount after setDropAmount()");
  }).timeout(5000);

  it("Create invalid session (amount too low)", async () => {
    faucetConfig.minDropAmount = 1000;
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.setDropAmount(500n);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    expect(testSession).to.not.equal(null, "createSession failed");
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.FAILED, "unexpected session status");
    expect(testSession.getSessionData("failed.code")).to.equal("AMOUNT_TOO_LOW", "unexpected error code");
  });

  it("Restore valid session", async () => {
    faucetConfig.sessionTimeout = 10;
    faucetConfig.minDropAmount = 1000;
    let now = Math.floor(new Date().getTime() / 1000);
    await ServiceManager.GetService(FaucetDatabase).updateSession({
      sessionId: "4e63566e-e482-46f3-bb91-da11f511aae5",
      status: FaucetSessionStatus.RUNNING,
      startTime: now,
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [],
      data: {"test.info": "test1"},
      claim: null,
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    await sessionManager.initialize();
    let testSession = sessionManager.getSession("4e63566e-e482-46f3-bb91-da11f511aae5", [FaucetSessionStatus.RUNNING]);
    expect(testSession).to.not.equal(undefined, "getSession failed");
    await testSession.tryProceedSession();
    expect(testSession.getRemoteIP()).to.equal("8.8.8.8", "unexpected remoteIP");
    expect(testSession.getTargetAddr()).to.equal("0x0000000000000000000000000000000000001337", "unexpected targetAddr");
    expect(Math.abs(testSession.getStartTime() - now)).to.be.lessThan(2, "unexpected startTime");
    expect(testSession.getBlockingTasks().length).to.equal(0, "unexpected blockingTasks");
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(1337n, "unexpected drop amount");
    testSession.setSessionModuleRef("test.info", "info1234");
    expect(testSession.getSessionModuleRef("test.info")).to.equal("info1234", "unexpected getSessionModuleRef result");
  });

  it("Restore invalid session (timed out)", async () => {
    faucetConfig.sessionTimeout = 10;
    faucetConfig.minDropAmount = 1000;
    let now = Math.floor(new Date().getTime() / 1000);
    await ServiceManager.GetService(FaucetDatabase).updateSession({
      sessionId: "4e63566e-e482-46f3-bb91-da11f511aae6",
      status: FaucetSessionStatus.RUNNING,
      startTime: now - 60,
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [],
      data: {},
      claim: null,
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    await sessionManager.initialize();
    let testSession = sessionManager.getSession("4e63566e-e482-46f3-bb91-da11f511aae6", [FaucetSessionStatus.RUNNING]);
    expect(testSession).to.not.equal(undefined, "getSession failed");
    await testSession.tryProceedSession();
    let sessionData = await sessionManager.getSessionData("4e63566e-e482-46f3-bb91-da11f511aae6");
    expect(sessionData).to.not.equal(null, "getSessionData failed");
    expect(sessionData.status).to.equal(FaucetSessionStatus.FAILED, "unexpected session status");
    expect(sessionData.data["failed.code"]).to.equal("SESSION_TIMEOUT", "unexpected error code");
  });

  it("Check session task handling ", async () => {
    faucetConfig.minDropAmount = 1000;
    let changeAddrCalled = 0;
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
      session.addBlockingTask("test", "test2", 10);
    });
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionIpChange, 100, "test-task", (session: FaucetSession) => {
      changeAddrCalled++;
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    expect(testSession).to.not.equal(null, "createSession failed");
    expect(testSession.getBlockingTasks().length).to.equal(2, "unexpected blockingTasks");
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.RUNNING, "unexpected session status");
    try {
      testSession.setTargetAddr("0x0000000000000000000000000000000000001338");
      expect(testSession.getTargetAddr()).to.equal("0x0000000000000000000000000000000000001337", "setTargetAddr must not change a already set address");
    } catch(error) {
      expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
      expect(error.getCode()).to.equal("INVALID_STATE", "unexpected error code");
    }
    await testSession.updateRemoteIP("::ffff:8.8.8.8");
    expect(changeAddrCalled).to.equal(0, "SessionIpChange for non-changed ip");
    await testSession.updateRemoteIP("8.8.4.4");
    expect(changeAddrCalled).to.equal(1, "no SessionIpChange for changed ip");
    expect(testSession.getRemoteIP()).to.equal("8.8.4.4", "unexpected remoteIP");
    testSession.setDropAmount(0n);
    expect(testSession.getDropAmount()).to.equal(0n, "unexpected drop amount");
    await testSession.addReward(1000n);
    testSession.resolveBlockingTask("test", "test1");
    expect(testSession.getBlockingTasks().length).to.equal(1, "unexpected blockingTasks count after resolving first task");
    testSession.resolveBlockingTask("test", "test2");
    expect(testSession.getBlockingTasks().length).to.equal(0, "unexpected blockingTasks count after resolving second task");
    await awaitSleepPromise(4000, () => testSession.getSessionStatus() === FaucetSessionStatus.CLAIMABLE);
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");
  }).timeout(5000);

  it("Check invalid session property changes", async () => {
    faucetConfig.minDropAmount = 1000;
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    expect(testSession).to.not.equal(null, "createSession failed");
    expect(testSession.getRemoteIP()).to.equal("8.8.8.8", "unexpected remoteIP");
    await testSession.subPenalty(1000n);
    expect(testSession.getDropAmount()).to.equal(0n, "unexpected drop amount after subPenalty from initial balance");
    await testSession.addReward(50n);
    testSession.resolveBlockingTask("test", "test1");
    await testSession.tryProceedSession(); // should fail with 0 balance
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.FAILED, "unexpected session status");
    await testSession.setDropAmount(1000n);
    expect(testSession.getDropAmount()).to.equal(50n, "unexpected drop amount after setDropAmount on failed session");
    await testSession.addReward(1000n);
    expect(testSession.getDropAmount()).to.equal(50n, "unexpected drop amount after addReward on failed session");
    await testSession.subPenalty(1000n);
    expect(testSession.getDropAmount()).to.equal(50n, "unexpected drop amount after subPenalty on failed session");
    let sessionInfo = await testSession.getSessionInfo();
    expect(sessionInfo.session).to.equal(testSession.getSessionId(), "invalid sessioninfo: id missmatch");
    expect(sessionInfo.balance).to.equal(testSession.getDropAmount().toString(), "invalid sessioninfo: balance missmatch");
    expect(sessionInfo.failedCode).to.equal("AMOUNT_TOO_LOW", "invalid sessioninfo: failedCode missmatch");
  });

  it("Check invalid balance change on failed session", async () => {
    faucetConfig.minDropAmount = 1000;
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    expect(testSession).to.not.equal(null, "createSession failed");
    expect(testSession.getRemoteIP()).to.equal("8.8.8.8", "unexpected remoteIP");
    await testSession.setSessionFailed("TEST_ERROR", "test");
    testSession.setDropAmount(1000n);
    expect(testSession.getDropAmount()).to.equal(0n, "unexpected drop amount after setDropAmount on failed session");
  });

  it("Check SessionManager: get session data", async () => {
    faucetConfig.minDropAmount = 1000;
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    expect(testSession).to.not.equal(null, "createSession failed");
    expect(sessionManager.getSession(testSession.getSessionId(), [FaucetSessionStatus.UNKNOWN])).to.equal(null, "unexpected getSession result for non-matching state");
    expect(sessionManager.getSession("4e63566e-e482-46f3-bb91-da11f511aae0", [FaucetSessionStatus.UNKNOWN])).to.equal(undefined, "unexpected getSession result for unknown session");
    expect(await sessionManager.getSessionData(testSession.getSessionId())).to.not.equal(null, "unexpected getSessionData result for known session");
    expect(await sessionManager.getSessionData("4e63566e-e482-46f3-bb91-da11f511aae0")).to.equal(null, "unexpected getSessionData result for unknown session");
    expect(sessionManager.getActiveSessions().length).to.equal(1, "unexpected getActiveSessions result count");
  });

  it("Check SessionManager: getUnclaimedBalance", async () => {
    faucetConfig.minDropAmount = 1000;
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    await testSession.addReward(1000n);
    expect(await sessionManager.getUnclaimedBalance()).to.equal(1000n, "unexpected getUnclaimedBalance result");
  });

  it("Check SessionManager: session timeout processing", async () => {
    faucetConfig.sessionTimeout = 10;
    faucetConfig.minDropAmount = 1000;
    let now = Math.floor(new Date().getTime() / 1000);
    await ServiceManager.GetService(FaucetDatabase).updateSession({
      sessionId: "4e63566e-e482-46f3-bb91-da11f511ab01",
      status: FaucetSessionStatus.RUNNING,
      startTime: now - 60,
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [],
      data: {},
      claim: null,
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    await sessionManager.initialize();
    await ServiceManager.GetService(FaucetDatabase).updateSession({
      sessionId: "4e63566e-e482-46f3-bb91-da11f511ab02",
      status: FaucetSessionStatus.RUNNING,
      startTime: now - 60,
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [],
      data: {},
      claim: null,
    });
    await sessionManager.processSessionTimeouts();
    await sessionManager.saveAllSessions();
    let session1 = await sessionManager.getSessionData("4e63566e-e482-46f3-bb91-da11f511ab01");
    expect(session1).to.not.equal(null, "getSessionData failed");
    expect(session1.status).to.equal(FaucetSessionStatus.FAILED, "unexpected session status");
    expect(session1.data["failed.code"]).to.equal("SESSION_TIMEOUT", "unexpected error code");
    let session2 = await sessionManager.getSessionData("4e63566e-e482-46f3-bb91-da11f511ab02");
    expect(session2).to.not.equal(null, "getSessionData failed");
    expect(session2.status).to.equal(FaucetSessionStatus.FAILED, "unexpected session status");
    expect(session2.data["failed.code"]).to.equal("SESSION_TIMEOUT", "unexpected error code");
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    await sessionManager.processSessionTimeouts();
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");
  });
});
