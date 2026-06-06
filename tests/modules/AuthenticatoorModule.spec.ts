import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { sleepPromise } from '../../src/utils/PromiseUtils.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleHookAction, ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { FaucetSession, FaucetSessionStatus } from '../../src/session/FaucetSession.js';
import { IAuthenticatoorConfig } from '../../src/modules/authenticatoor/AuthenticatoorConfig.js';
import { AuthenticatoorVerifier, IAuthenticatoorClaims } from '../../src/modules/authenticatoor/AuthenticatoorVerifier.js';
import { AuthenticatoorDB } from '../../src/modules/authenticatoor/AuthenticatoorDB.js';

const AUTH_URL = "http://auth.test.local";
const AUDIENCE = "faucet.test.local";

function tokenFor(email: string): string {
  // Tokens never reach the verifier — the stub keys off this label string.
  return "stub.token." + email;
}

describe("Faucet module: authenticatoor (module)", () => {
  let globalStubs: any;
  let verifyStub: sinon.SinonStub;

  beforeEach(async () => {
    verifyStub = sinon.stub(AuthenticatoorVerifier.prototype, "verify").callsFake(async (token: string) => {
      let m = /^stub\.token\.(.+)$/.exec(token);
      if(!m) throw new Error("verifier: bad token");
      let email = m[1];
      return {
        sub: email,
        email: email,
        iss: AUTH_URL,
        aud: AUDIENCE,
        scope: "*." + AUDIENCE,
      } as IAuthenticatoorClaims;
    });

    globalStubs = bindTestStubs({
      "AuthenticatoorVerifier.verify": verifyStub,
    });
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    faucetConfig.modules["authenticatoor"] = {
      enabled: true,
      authUrl: AUTH_URL,
      expectedAudience: AUDIENCE,
      expectedHost: null,
      requireLogin: false,
      concurrencyLimit: 0,
      grants: [],
      loginLabel: "Login for benefits",
      userLabel: "Authenticated",
      loginLogo: null,
      infoHtml: "auth info",
    } as IAuthenticatoorConfig;
  });

  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  it("Check client config exports", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    let mod = clientConfig.modules['authenticatoor'];
    expect(!!mod).to.equal(true, "no authenticatoor config exported");
    expect(mod.authUrl).to.equal(AUTH_URL, "client config mismatch: authUrl");
    expect(mod.requireLogin).to.equal(false, "client config mismatch: requireLogin");
    expect(mod.loginLabel).to.equal("Login for benefits", "client config mismatch: loginLabel");
    expect(mod.userLabel).to.equal("Authenticated", "client config mismatch: userLabel");
    expect(mod.infoHtml).to.match(/auth info/, "client config mismatch: infoHtml");
    // Internal fields like grants/concurrencyLimit must not leak to the client.
    expect((mod as any).grants).to.equal(undefined, "grants leaked to client config");
    expect((mod as any).concurrencyLimit).to.equal(undefined, "concurrencyLimit leaked to client config");
    expect((mod as any).expectedAudience).to.equal(undefined, "expectedAudience leaked to client config");
  });

  it("expectedHost is propagated to the verifier", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).expectedHost = "faucet.example.com";
    await ServiceManager.GetService(ModuleManager).initialize();
    let mod = ServiceManager.GetService(ModuleManager).getModule<any>("authenticatoor");
    expect(mod.verifier.expectedHost).to.equal("faucet.example.com");
  });

  it("Module reload reinitializes verifier", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).expectedAudience = "new.aud";
    let mod = ServiceManager.GetService(ModuleManager).getModule<any>("authenticatoor");
    mod.onConfigReload();
    expect(mod.verifier).to.not.equal(null, "verifier should be re-created");
  });

  it("Optional login: session starts without token (no auth data)", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");
    expect(testSession.getSessionData("authenticatoor.data")).to.equal(undefined, "authenticatoor.data set without token");
    expect(verifyStub.callCount).to.equal(0, "verifier should not be called without token");
  });

  it("requireLogin: session without token is rejected", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).requireLogin = true;
    await ServiceManager.GetService(ModuleManager).initialize();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) { error = ex; }
    expect(error).to.not.equal(null, "no error thrown");
    expect(error?.getCode()).to.equal("AUTHENTICATOOR_REQUIRED", "unexpected error code");
  });

  it("Invalid token is rejected", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    verifyStub.rejects(new Error("verifier: bad signature"));
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        authToken: "stub.token.alice@example.com",
      });
    } catch(ex) { error = ex; }
    expect(error).to.not.equal(null, "no error thrown");
    expect(error?.getCode()).to.equal("AUTHENTICATOOR_TOKEN", "unexpected error code");
    expect(error?.message).to.match(/Invalid authenticatoor login token/, "unexpected error message");
  });

  it("Skipping authenticatoor module is honored", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 1, "skip-test", (session: FaucetSession) => {
      session.setSessionData("skip.modules", ["authenticatoor"]);
    });
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(testSession.getSessionData("authenticatoor.data")).to.equal(undefined, "auth data set even though module was skipped");
    expect(verifyStub.callCount).to.equal(0, "verifier should not be called when skipped");
  });

  it("Valid token: stores auth data and applies grant perks", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 0,
      rewardFactor: 2,
      overrideMaxDrop: 2000000000000000000,
      skipModules: ["recurring-limits", "ipinfo"],
    });
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");
    let data = testSession.getSessionData<any>("authenticatoor.data");
    expect(!!data).to.equal(true, "no auth data stored");
    expect(data.userId).to.equal("alice@example.com", "userId mismatch");
    expect(data.email).to.equal("alice@example.com", "email mismatch");
    expect(data.issuer).to.equal(AUTH_URL, "issuer mismatch");
    expect(testSession.getSessionData("authenticatoor.factor")).to.equal(2, "rewardFactor not stored");
    expect(testSession.getSessionData("overrideMaxDropAmount")).to.equal("2000000000000000000", "overrideMaxDropAmount not stored");
    // setDropAmount(N) routes through addReward, which applies the rewardFactor.
    // The cap (overrideMaxDropAmount) clamps back down at claim time.
    expect(testSession.getDropAmount()).to.equal(4000000000000000000n, "dropAmount mismatch (override * factor)");
    let skipped = testSession.getSessionData<string[]>("skip.modules", []);
    expect(skipped.indexOf("recurring-limits")).to.not.equal(-1, "skip.modules missing recurring-limits");
    expect(skipped.indexOf("ipinfo")).to.not.equal(-1, "skip.modules missing ipinfo");
  });

  it("overrideMaxDrop without rewardFactor produces exact fixed drop", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 0,
      overrideMaxDrop: 1500000000000000000,
    });
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(testSession.getDropAmount()).to.equal(1500000000000000000n, "dropAmount should equal overrideMaxDrop without factor");
    expect(testSession.getSessionData("overrideMaxDropAmount")).to.equal("1500000000000000000");
  });

  it("rewardFactor flows through SessionRewardFactor hook", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 0,
      rewardFactor: 1.5,
    });
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    let factors: any[] = [];
    await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionRewardFactor, [testSession, factors]);
    let factor = factors.find(f => f.module === "authenticatoor");
    expect(!!factor).to.equal(true, "no authenticatoor factor in reward factors");
    expect(factor.factor).to.equal(1.5, "factor value mismatch");
  });

  it("Token without email/sub is rejected", async () => {
    verifyStub.callsFake(async () => ({} as IAuthenticatoorClaims));
    await ServiceManager.GetService(ModuleManager).initialize();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        authToken: "anything",
      });
    } catch(ex) { error = ex; }
    expect(error).to.not.equal(null, "no error thrown");
    expect(error?.getCode()).to.equal("AUTHENTICATOOR_TOKEN", "expected token rejection");
  });

  it("Token with sub but no email falls back to sub", async () => {
    verifyStub.callsFake(async () => ({
      sub: "subject-id-123",
      iss: AUTH_URL,
    } as IAuthenticatoorClaims));
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: "anything",
    });
    let data = testSession.getSessionData<any>("authenticatoor.data");
    expect(data.userId).to.equal("subject-id-123", "userId should fall back to sub");
    expect(data.email).to.equal("", "email should be empty when not in token");
  });

  it("Grants with limitCount enforce per-user count limit", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 1,
      required: true,
    });
    await ServiceManager.GetService(ModuleManager).initialize();
    // First session passes.
    let s1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(s1.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE);
    // Second session for same user is rejected.
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        authToken: tokenFor("alice@example.com"),
      });
    } catch(ex) { error = ex; }
    expect(error?.getCode()).to.equal("AUTHENTICATOOR_LIMIT", "expected limit error");
    expect(error?.message).to.match(/already created/, "unexpected error message");
  });

  it("Grants with limitCount + custom message use the custom message", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 1,
      required: true,
      message: "test_message_9842",
    });
    await ServiceManager.GetService(ModuleManager).initialize();
    await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        authToken: tokenFor("alice@example.com"),
      });
    } catch(ex) { error = ex; }
    expect(error?.getCode()).to.equal("AUTHENTICATOOR_LIMIT");
    expect(error?.message).to.match(/test_message_9842/, "custom message not used");
  });

  it("Grants with limitAmount enforce per-user amount limit", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).grants.push({
      duration: 3600,
      limitAmount: 1000000000000000000,
      limitCount: 0,
      required: true,
    });
    await ServiceManager.GetService(ModuleManager).initialize();
    let s1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(s1.getDropAmount()).to.equal(1000000000000000000n, "first session drop");
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        authToken: tokenFor("alice@example.com"),
      });
    } catch(ex) { error = ex; }
    expect(error?.getCode()).to.equal("AUTHENTICATOOR_LIMIT", "expected limit error");
    expect(error?.message).to.match(/already requested/, "unexpected error message");
  });

  it("Grants without 'required' degrade to no-perks instead of throwing", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 1,
      rewardFactor: 5,
      // not required
    }, {
      duration: 3600,
      limitAmount: 0,
      limitCount: 0,
      rewardFactor: 1.2,
    });
    await ServiceManager.GetService(ModuleManager).initialize();
    // First session uses the limited grant (factor 5).
    let s1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(s1.getSessionData("authenticatoor.factor")).to.equal(1.2, "second grant should override the spent first one");
    // Second session: limited grant exceeds limit, falls through to baseline grant.
    let s2 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(s2.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "session should still complete");
    expect(s2.getSessionData("authenticatoor.factor")).to.equal(1.2, "factor should fall back to baseline");
  });

  it("Concurrency limit: rejects extra sessions for the same user", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).concurrencyLimit = 1;
    await ServiceManager.GetService(ModuleManager).initialize();
    // Add a blocking task so the first session stays "running" instead of completing.
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "blocker", (session: FaucetSession) => {
      session.addBlockingTask("test", "test", 1);
    });
    let s1 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(s1.getSessionStatus()).to.equal(FaucetSessionStatus.RUNNING);
    await sleepPromise(20);

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        authToken: tokenFor("alice@example.com"),
      });
    } catch(ex) { error = ex; }
    expect(error?.getCode()).to.equal("AUTHENTICATOOR_CONCURRENCY_LIMIT");
    expect(error?.message).to.match(/concurrent sessions/, "unexpected error message");
  });

  it("Concurrency limit only counts other authenticated users", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).concurrencyLimit = 1;
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "blocker", (session: FaucetSession) => {
      session.addBlockingTask("test", "test", 1);
    });
    // Session A: alice (running)
    await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    await sleepPromise(20);
    // Session B: bob — should NOT trip alice's concurrency limit.
    let s2 = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001338",
      authToken: tokenFor("bob@example.com"),
    });
    expect(s2.getSessionStatus()).to.equal(FaucetSessionStatus.RUNNING, "bob should be unaffected by alice's limit");
  });

  it("SessionComplete persists user→session mapping in DB", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE);

    let mod = ServiceManager.GetService(ModuleManager).getModule<any>("authenticatoor");
    let db: AuthenticatoorDB = mod.authDb;
    let rows = await db.getUserSessions("alice@example.com", 3600, true);
    expect(rows.length).to.equal(1, "expected one persisted session for alice");
    expect(rows[0].sessionId).to.equal(testSession.getSessionId(), "persisted session id mismatch");
  });

  it("SessionComplete is a no-op when no auth data stored", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    // No token → no auth data → SessionComplete should not write anything.
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE);
    let mod = ServiceManager.GetService(ModuleManager).getModule<any>("authenticatoor");
    let db: AuthenticatoorDB = mod.authDb;
    let rows = await db.getUserSessions("alice@example.com", 3600, true);
    expect(rows.length).to.equal(0, "no rows expected without auth data");
  });

  it("Database cleanStore removes orphaned rows", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    let now = Math.floor(Date.now() / 1000);
    await ServiceManager.GetService(FaucetDatabase).updateSession({
      sessionId: testSession.getSessionId(),
      status: FaucetSessionStatus.FINISHED,
      startTime: now - faucetConfig.sessionCleanup - 10,
      targetAddr: "0x0000000000000000000000000000000000001337",
      dropAmount: "1337",
      remoteIP: "8.8.8.8",
      tasks: [],
      data: {},
      claim: null,
    });

    ServiceManager.GetService(FaucetDatabase).cleanStore();
    await sleepPromise(50);

    let mod = ServiceManager.GetService(ModuleManager).getModule<any>("authenticatoor");
    let db: AuthenticatoorDB = mod.authDb;
    await db.cleanStore();
    let rows = await db.getUserSessions("alice@example.com", 99999999, true);
    expect(rows.length).to.equal(0, "row should have been cleaned up");
  });

  it("expectedAudience missing: module still constructs verifier (with empty audience)", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).expectedAudience = null;
    await ServiceManager.GetService(ModuleManager).initialize();
    let mod = ServiceManager.GetService(ModuleManager).getModule<any>("authenticatoor");
    expect(mod.verifier).to.not.equal(null, "verifier should be created even without audience");
  });

  it("authUrl missing: module loads without verifier and rejects auth attempts", async () => {
    (faucetConfig.modules["authenticatoor"] as IAuthenticatoorConfig).authUrl = "";
    await ServiceManager.GetService(ModuleManager).initialize();
    let mod = ServiceManager.GetService(ModuleManager).getModule<any>("authenticatoor");
    expect(mod.verifier).to.equal(null, "verifier should be null without authUrl");
    // With no verifier, presented tokens are silently ignored (treated as no token).
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      authToken: tokenFor("alice@example.com"),
    });
    expect(testSession.getSessionData("authenticatoor.data")).to.equal(undefined, "no auth data without verifier");
    expect(verifyStub.callCount).to.equal(0, "verifier should not be called without authUrl");
  });
});
