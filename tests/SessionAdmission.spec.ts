import 'mocha';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from './common.js';
import { sleepPromise } from '../src/utils/PromiseUtils.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { ModuleHookAction, ModuleManager } from '../src/modules/ModuleManager.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { FaucetError } from '../src/common/FaucetError.js';
import { FaucetSession, FaucetSessionStatus } from '../src/session/FaucetSession.js';

describe("Session admission", () => {
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

  function addHook(action: ModuleHookAction, hook: (session: FaucetSession, userInput: any) => any): void {
    ServiceManager.GetService(ModuleManager).addActionHook(null, action, 50, "test hook", hook);
  }

  function keepRunning(): void {
    addHook(ModuleHookAction.SessionStart, (session) => session.addBlockingTask("test", "block", 600));
  }

  function startSessions(count: number, input?: any): Promise<PromiseSettledResult<FaucetSession>[]> {
    return Promise.allSettled(Array.from({length: count}, (_, idx) => ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", Object.assign({
      addr: "0x0000000000000000000000000000000000001337",
      idx: idx,
    }, input || {}))));
  }

  it("admits one session at a time, in the order the starts asked", async () => {
    let inside = 0;
    let maxInside = 0;
    let order: number[] = [];
    addHook(ModuleHookAction.SessionAdmit, async (session, userInput) => {
      inside++;
      maxInside = Math.max(maxInside, inside);
      order.push(userInput.idx);
      await sleepPromise(10);
      inside--;
    });
    let results = await startSessions(5);
    expect(results.every((res) => res.status === "fulfilled")).to.equal(true, "a start failed");
    expect(maxInside).to.equal(1, "admissions overlapped");
    expect(order).to.deep.equal([0, 1, 2, 3, 4], "admissions out of order");
  });

  it("runs the first half of the start concurrently", async () => {
    let inside = 0;
    let maxInside = 0;
    addHook(ModuleHookAction.SessionStart, async () => {
      inside++;
      maxInside = Math.max(maxInside, inside);
      await sleepPromise(20);
      inside--;
    });
    await startSessions(3);
    expect(maxInside).to.equal(3, "session starts were serialized");
  });

  it("a session admitted before is visible to the next admission, in memory and in the database", async () => {
    keepRunning();
    let seen: { active: number, stored: number }[] = [];
    addHook(ModuleHookAction.SessionAdmit, async (session) => {
      let active = ServiceManager.GetService(SessionManager).getActiveSessions().filter((sess) => sess !== session).length;
      let stored = (await ServiceManager.GetService(FaucetDatabase).getSessions([FaucetSessionStatus.RUNNING])).length;
      seen.push({ active: active, stored: stored });
    });
    await startSessions(3);
    expect(seen).to.deep.equal([
      { active: 0, stored: 0 },
      { active: 1, stored: 1 },
      { active: 2, stored: 2 },
    ], "an admitted session was not visible to the next admission");
  });

  it("a count limit in the admission holds for parallel starts", async () => {
    keepRunning();
    addHook(ModuleHookAction.SessionAdmit, (session) => {
      let others = ServiceManager.GetService(SessionManager).getActiveSessions().filter((sess) => sess !== session && sess.getTargetAddr() === session.getTargetAddr());
      if(others.length >= 1)
        throw new FaucetError("TEST_LIMIT", "only one session per address");
    });
    let results = await startSessions(5);
    let running = results.filter((res) => res.status === "fulfilled" && res.value.getSessionStatus() === FaucetSessionStatus.RUNNING);
    let limited = results.filter((res) => res.status === "rejected" && (res.reason as FaucetError).getCode() === "TEST_LIMIT");
    expect(running.length).to.equal(1, "more than one session admitted");
    expect(limited.length).to.equal(4, "the other starts should hit the limit");
  });

  it("a failed admission fails the session and lets the next one in", async () => {
    addHook(ModuleHookAction.SessionAdmit, (session, userInput) => {
      if(userInput.idx === 0)
        throw new FaucetError("TEST_FAIL", "admission failed");
    });
    let results = await startSessions(2);
    expect(results[0].status).to.equal("rejected", "failing admission started the session");
    expect(((results[0] as PromiseRejectedResult).reason as FaucetError).getCode()).to.equal("TEST_FAIL");
    expect(results[1].status).to.equal("fulfilled", "the next admission was blocked");
    expect((results[1] as PromiseFulfilledResult<FaucetSession>).value.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE);
  });

  it("an unexpected error in the admission fails the session as an internal error", async () => {
    let failed: FaucetSession = null;
    addHook(ModuleHookAction.SessionAdmit, (session) => {
      failed = session;
      throw new Error("boom");
    });
    let results = await startSessions(1);
    expect(results[0].status).to.equal("rejected");
    expect(failed.getSessionStatus()).to.equal(FaucetSessionStatus.FAILED, "session not failed");
    expect(failed.getSessionData("failed.code")).to.equal("INTERNAL_ERROR");
  });

  it("a start that does not get its turn in time fails, the queue goes on", async () => {
    ServiceManager.GetService(SessionManager).admissionTimeout = 50;
    addHook(ModuleHookAction.SessionAdmit, async (session, userInput) => {
      if(userInput.idx === 0)
        await sleepPromise(150);
    });
    let results = await startSessions(2);
    expect(results[0].status).to.equal("fulfilled", "the slow admission failed");
    expect(results[1].status).to.equal("rejected", "the waiting start did not time out");
    expect(((results[1] as PromiseRejectedResult).reason as FaucetError).getCode()).to.equal("SESSION_ADMISSION_TIMEOUT");

    let next = await startSessions(1, { idx: 2 });
    expect(next[0].status).to.equal("fulfilled", "the queue is stuck after a timeout");
  });

  it("a timed out start does not let a later one skip the admission still running", async () => {
    ServiceManager.GetService(SessionManager).admissionTimeout = 50;
    let inside = 0;
    let maxInside = 0;
    addHook(ModuleHookAction.SessionAdmit, async (session, userInput) => {
      inside++;
      maxInside = Math.max(maxInside, inside);
      await sleepPromise(userInput.idx === 0 ? 150 : 5);
      inside--;
    });
    let first = startSessions(2);
    await sleepPromise(80); // the second start has timed out by now, the first is still admitting
    let later = startSessions(1, { idx: 2 });
    await Promise.all([first, later]);
    expect(maxInside).to.equal(1, "a later start ran its admission next to the one still running");
  });

  it("the start returns once the session's row is saved", async () => {
    keepRunning();
    let session = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let stored = await ServiceManager.GetService(FaucetDatabase).getSession(session.getSessionId());
    expect(stored?.status).to.equal(FaucetSessionStatus.RUNNING, "session row not saved when the start returned");
  });
});
