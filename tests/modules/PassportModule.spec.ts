import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, returnDelayedPromise } from '../common.js';
import { FetchUtil } from '../../src/utils/FetchUtil.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleHookAction, ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { DATA as testData } from './PassportModule.data.js';
import { FaucetSession } from '../../src/session/FaucetSession.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { FaucetHttpResponse } from '../../src/webserv/FaucetHttpServer.js';
import { PassportResolver } from '../../src/modules/passport/PassportResolver.js';


describe("Faucet module: passport", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({
      "fetch": sinon.stub(FetchUtil, "fetch"),
    });
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  function tmpFolder(prefix?: string, suffix?: string, tmpdir?: string): string {
    prefix = (typeof prefix !== 'undefined') ? prefix : 'tmp.';
    suffix = (typeof suffix !== 'undefined') ? suffix : '';
    tmpdir = tmpdir ? tmpdir : os.tmpdir();
    return path.join(tmpdir, prefix + crypto.randomBytes(16).toString('hex') + suffix);
  }

  it("Check client config exports", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 30,
      trustedIssuers: [ "did:key:z6MkghvGHLobLEdj1bgRLhS4LPGJAvbMA1tn2zcRyqmYU5LC" ],
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    expect(!!clientConfig.modules['passport']).to.equal(true, "no passport config exported");
    expect(clientConfig.modules['passport'].refreshTimeout).to.equal(30, "client config missmatch: refreshTimeout");
    expect(clientConfig.modules['passport'].manualVerification).to.equal(true, "client config missmatch: manualVerification");
    expect(JSON.stringify(clientConfig.modules['passport'].stampScoring)).to.equal(JSON.stringify((faucetConfig.modules["passport"] as any).stampScoring), "client config missmatch: stampScoring");
    expect(JSON.stringify(clientConfig.modules['passport'].boostFactor)).to.equal(JSON.stringify((faucetConfig.modules["passport"] as any).boostFactor), "client config missmatch: boostFactor");
  }).timeout(6000); // might take longer than the other passport tests, because the didkit lib is loaded when the module gets enabled first

  it("Start session with successful passport request", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(globalStubs["fetch"].callCount).to.equal(1, "unexpected fetch call count");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(2, "unexpected passport score");
    expect(passportScore?.factor).to.equal(4, "unexpected passport factor");
    let clientInfo = await testSession.getSessionInfo();
    expect(!!(clientInfo.modules as any)["passport"]).to.equal(false, "unexpected passport info in client session info");
  });

  it("Start session with passport api error", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(0, "unexpected passport score");
    expect(passportScore?.factor).to.equal(1, "unexpected passport factor");
  });

  it("Send passport info to client for running sessions", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let clientInfo = await testSession.getSessionInfo();
    expect(!!(clientInfo.modules as any)["passport"]).to.equal(true, "missing passport info in client session info");
    expect((clientInfo.modules as any)["passport"].score).to.equal(2, "unexpected passport score");
    expect((clientInfo.modules as any)["passport"].factor).to.equal(4, "unexpected passport factor");
  });

  it("Get passport details for running session", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    
    let passportDetailsRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/getPassportInfo?session=" + testSession.getSessionId(),
    } as any, undefined);
    expect(passportDetailsRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(passportDetailsRsp.passport?.found).to.equal(true, "no passport details returned");
    expect(passportDetailsRsp.score.score).to.equal(2, "unexpected passport score");
    expect(passportDetailsRsp.score.factor).to.equal(4, "unexpected passport factor");
  });

  it("Get passport details for unknown session", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
    } as any;
    await ServiceManager.GetService(ModuleManager).initialize();
    let passportDetailsRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/getPassportInfo?session=62dff880-ffe6-4472-a19a-0859e134456f",
    } as any, undefined);
    expect(passportDetailsRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportDetailsRsp.error).to.equal(true, "no error returned");
    expect(passportDetailsRsp.code).to.equal("INVALID_SESSION", "unexpected error code");
  });

  it("Refresh passport details for unknown session", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
    } as any;
    await ServiceManager.GetService(ModuleManager).initialize();
    let passportDetailsRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/refreshPassport?session=62dff880-ffe6-4472-a19a-0859e134456f",
    } as any, undefined);
    expect(passportDetailsRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportDetailsRsp.error).to.equal(true, "no error returned");
    expect(passportDetailsRsp.code).to.equal("INVALID_SESSION", "unexpected error code");
  });

  it("Get passport details for session without passport info", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.reject("strange api error")
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");

    let passportDetailsRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/getPassportInfo?session=" + testSession.getSessionId(),
    } as any, undefined);
    expect(passportDetailsRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(passportDetailsRsp.passport?.found).to.equal(false, "no passport details returned");
    expect(passportDetailsRsp.score.score).to.equal(0, "unexpected passport score");
    expect(passportDetailsRsp.score.factor).to.equal(1, "unexpected passport factor");
  });

  it("Check passport cache (DB cache)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",

      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session1 status");
    expect(globalStubs["fetch"].callCount).to.equal(1, "unexpected fetch call count after session1 start");
    testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session2 status");
    expect(globalStubs["fetch"].callCount).to.equal(1, "unexpected fetch call count after session2 start");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(2, "unexpected passport score");
    expect(passportScore?.factor).to.equal(4, "unexpected passport factor");
    let clientInfo = await testSession.getSessionInfo();
    expect(!!(clientInfo.modules as any)["passport"]).to.equal(false, "unexpected passport info in client session info");
  });

  it("Check passport cache (DB cache)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",

      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session1 status");
    expect(globalStubs["fetch"].callCount).to.equal(1, "unexpected fetch call count after session1 start");
    testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session2 status");
    expect(globalStubs["fetch"].callCount).to.equal(1, "unexpected fetch call count after session2 start");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(2, "unexpected passport score");
    expect(passportScore?.factor).to.equal(4, "unexpected passport factor");
    let clientInfo = await testSession.getSessionInfo();
    expect(!!(clientInfo.modules as any)["passport"]).to.equal(false, "unexpected passport info in client session info");
  });

  it("Check passport cache (DB cache, race condition)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",

      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let [testSession] = await Promise.all([
      sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
      }),
      sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
      })
    ]);
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session1 status");
    expect(globalStubs["fetch"].callCount).to.equal(1, "unexpected fetch call count after session start");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(2, "unexpected passport score");
    expect(passportScore?.factor).to.equal(4, "unexpected passport factor");
  });

  it("Refresh passport for a running session (automatic refresh)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found")

    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, undefined);
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(passportRefreshRsp.passport?.found).to.equal(true, "no passport details returned in refresh result");
    expect(passportRefreshRsp.score.score).to.equal(2, "unexpected passport score in refresh result");
    expect(passportRefreshRsp.score.factor).to.equal(4, "unexpected passport factor in refresh result");
    let now = Math.floor(new Date().getTime() / 1000);
    expect(Math.abs(passportRefreshRsp.cooldown - now)).to.be.lessThan(2, "unexpected cooldown");
    passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found after refresh")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(2, "unexpected passport score");
    expect(passportScore?.factor).to.equal(4, "unexpected passport factor");
  });

  it("Refresh passport for a running session (manual refresh)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found")

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify((testData as any).testPassport1Json))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(passportRefreshRsp.passport?.found).to.equal(true, "no passport details returned in refresh result");
    expect(passportRefreshRsp.score.score).to.equal(2, "unexpected passport score in refresh result");
    expect(passportRefreshRsp.score.factor).to.equal(4, "unexpected passport factor in refresh result");
    let now = Math.floor(new Date().getTime() / 1000);
    expect(Math.abs(passportRefreshRsp.cooldown - now)).to.be.lessThan(2, "unexpected cooldown");
    passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found after refresh")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(2, "unexpected passport score");
    expect(passportScore?.factor).to.equal(4, "unexpected passport factor");
  });

  it("Refresh passport for a running session (manual refresh, no newer stamp)", async () => {
    let tmpdir = tmpFolder("powfaucet", "passports");
    fs.mkdirSync(tmpdir);
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      cachePath: tmpdir,
      refreshCooldown: 0,
      stampScoring: {
        "TwitterTweetGT10": 1,
        "TwitterFollowerGT100": 1,
      },
      boostFactor: {
        2: 4,
      },
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve((testData as any).testPassport1Rsp)
    }));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found")

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify((testData as any).testPassport1Json))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(passportRefreshRsp.passport?.found).to.equal(true, "no passport details returned in refresh result");
    expect(passportRefreshRsp.score.score).to.equal(2, "unexpected passport score in refresh result");
    expect(passportRefreshRsp.score.factor).to.equal(4, "unexpected passport factor in refresh result");
    let now = Math.floor(new Date().getTime() / 1000);
    expect(Math.abs(passportRefreshRsp.cooldown - now)).to.be.lessThan(2, "unexpected cooldown");
    passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(true, "no passport data found after refresh")
    let passportScore = testSession.getSessionData("passport.score");
    expect(passportScore?.score).to.equal(2, "unexpected passport score");
    expect(passportScore?.factor).to.equal(4, "unexpected passport factor");
    fs.rmSync(tmpdir, { recursive: true, force: true });
  });

  it("Refresh passport for a running session (manual refresh, invalid json)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found");

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify({not: "a_passport", json: 1}))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportRefreshRsp.error).to.equal(true, "no error returned");
    expect(passportRefreshRsp.code).to.equal("PASSPORT_VALIDATION", "unexpected error code returned");
  });

  it("Refresh passport for a running session (manual refresh, invalid json 1)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found");

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify((testData as any).invalidPassportJson1))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportRefreshRsp.error).to.equal(true, "no error returned");
    expect(passportRefreshRsp.code).to.equal("PASSPORT_VALIDATION", "unexpected error code returned");
    expect(passportRefreshRsp.errors.length).to.equal(1, "unexpected number of verification errors returned");
  });
  it("Refresh passport for a running session (manual refresh, invalid json 2)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found");

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify((testData as any).invalidPassportJson2))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportRefreshRsp.error).to.equal(true, "no error returned");
    expect(passportRefreshRsp.code).to.equal("PASSPORT_VALIDATION", "unexpected error code returned");
    expect(passportRefreshRsp.errors.length).to.equal(1, "unexpected number of verification errors returned");
    expect(passportRefreshRsp.errors[0]).to.match(/duplicate provider/, "unexpected verification error returned");
  });
  it("Refresh passport for a running session (manual refresh, invalid json 3)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found");

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify((testData as any).invalidPassportJson3))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportRefreshRsp.error).to.equal(true, "no error returned");
    expect(passportRefreshRsp.code).to.equal("PASSPORT_VALIDATION", "unexpected error code returned");
    expect(passportRefreshRsp.errors.length).to.equal(1, "unexpected number of verification errors returned");
    expect(passportRefreshRsp.errors[0]).to.match(/not signed for expected wallet/, "unexpected verification error returned");
  });
  it("Refresh passport for a running session (manual refresh, invalid json 4)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found");

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify((testData as any).invalidPassportJson4))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportRefreshRsp.error).to.equal(true, "no error returned");
    expect(passportRefreshRsp.code).to.equal("PASSPORT_VALIDATION", "unexpected error code returned");
    expect(passportRefreshRsp.errors.length).to.equal(2, "unexpected number of verification errors returned");
    expect(passportRefreshRsp.errors[0]).to.match(/issuer not trusted/, "unexpected verification error returned");
    expect(passportRefreshRsp.errors[1]).to.match(/invalid proof verificationMethod/, "unexpected verification error returned");
  });
  it("Refresh passport for a running session (manual refresh, invalid json 5)", async () => {
    faucetConfig.modules["passport"] = {
      enabled: true,
      scorerApiKey: "test-api-key",
      refreshCooldown: 0,
    } as any;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "test api error"));
    globalStubs["PassportResolver.getVerifyTime"] = sinon.stub(PassportResolver.prototype as any, "getVerifyTime").returns(1686844923);
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x332E43696A505EF45b9319973785F837ce5267b9",
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status");
    let passportData = testSession.getSessionData("passport.data");
    expect(passportData?.found).to.equal(false, "unexpected passport data found");

    let passportRefreshRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/refreshPassport?session=" + testSession.getSessionId(),
    } as any, Buffer.from(JSON.stringify(JSON.stringify((testData as any).invalidPassportJson5))));
    expect(passportRefreshRsp instanceof FaucetHttpResponse).to.equal(false, "unexpected plain http response");
    expect(!!passportRefreshRsp.error).to.equal(true, "no error returned");
    expect(passportRefreshRsp.code).to.equal("PASSPORT_VALIDATION", "unexpected error code returned");
    expect(passportRefreshRsp.errors.length).to.equal(3, "unexpected number of verification errors returned");
    expect(passportRefreshRsp.errors[0]).to.match(/integrity check failed/, "unexpected verification error returned");
    expect(passportRefreshRsp.errors[1]).to.match(/integrity check failed/, "unexpected verification error returned");
    expect(passportRefreshRsp.errors[2]).to.match(/integrity check failed/, "unexpected verification error returned");
  });

});