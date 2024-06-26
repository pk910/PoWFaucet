import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, loadDefaultTestConfig, unbindTestStubs } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FAUCETSTATUS_CACHE_TIME, FaucetWebApi } from '../src/webserv/FaucetWebApi.js';
import { IncomingHttpHeaders, IncomingMessage } from 'http';
import { Socket } from 'net';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { ModuleHookAction, ModuleManager } from '../src/modules/ModuleManager.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { FaucetHttpResponse } from '../src/webserv/FaucetHttpServer.js';
import { FaucetSession, FaucetSessionStatus, FaucetSessionStoreData } from '../src/session/FaucetSession.js';
import { getNewGuid } from '../src/utils/GuidUtils.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { EthClaimManager } from '../src/eth/EthClaimManager.js';
import { FaucetError } from '../src/common/FaucetError.js';
import { sha256 } from '../src/utils/CryptoUtils.js';
import { EthWalletManager } from '../src/eth/EthWalletManager.js';
import { FakeProvider } from './stubs/FakeProvider.js';

describe("Faucet Web API", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({});
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

  function encodeApiRequest(options: {
    url: string;
    remoteAddr: string;
    method?: string;
    headers?: IncomingHttpHeaders;
  }): IncomingMessage {
    let socketData = {
      remoteAddress: options.remoteAddr,
    };
    let socket: Socket = socketData as any;
    Object.setPrototypeOf(socket, Socket.prototype);
    let messageData = {
      method: options.method || "GET",
      socket: socket,
      url: options.url,
      headers: options.headers || {},
    };
    let message: IncomingMessage = messageData as any;
    Object.setPrototypeOf(message, IncomingMessage.prototype);
    return message;
  }

  async function addTestSession(data: Partial<FaucetSessionStoreData>): Promise<FaucetSessionStoreData> {
    let sessionData: FaucetSessionStoreData = Object.assign({
      sessionId: getNewGuid(),
      startTime: Math.floor(new Date().getTime() / 1000),
      status: FaucetSessionStatus.CLAIMABLE,
      dropAmount: "100",
      remoteIP: "8.8.8.8",
      targetAddr: "0x0000000000000000000000000000000000001337",
      tasks: [],
      data: {},
      claim: null,
    }, data);
    await ServiceManager.GetService(FaucetDatabase).updateSession(sessionData);
    return sessionData;
  }

  it("check unknown endpoint call", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/unknown_Endpoint_126368?x=y&z",
      remoteAddr: "8.8.8.8"
    }));
    expect(apiResponse instanceof FaucetHttpResponse).equal(true, "no api error response");
    expect(apiResponse.code).equal(404, "unexpected response code");
  });

  it("check null endpoint call", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api",
      remoteAddr: "8.8.8.8"
    }));
    expect(apiResponse instanceof FaucetHttpResponse).equal(true, "no api error response");
    expect(apiResponse.code).equal(404, "unexpected response code");
  });

  it("check /api/getVersion", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getVersion",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse).equal(faucetConfig.faucetVersion, "unexpected response value");
  });

  it("check /api/getMaxReward", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getMaxReward",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse).equal(faucetConfig.maxDropAmount, "unexpected response value");
  });

  it("check /api/getFaucetConfig", async () => {
    let fakeProvider = new FakeProvider();
    fakeProvider.injectResponse("eth_chainId", 1337);
    fakeProvider.injectResponse("eth_getBalance", "1000");
    fakeProvider.injectResponse("eth_getTransactionCount", 42);

    faucetConfig.ethWalletKey = "feedbeef12340000feedbeef12340000feedbeef12340000feedbeef12340000";
    faucetConfig.ethRpcHost = fakeProvider as any;
    faucetConfig.faucetHomeHtml = "test123 {faucetWallet}"

    let walletManager = ServiceManager.GetService(EthWalletManager);
    walletManager.initialize();

    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetConfig?cliver=0.0.1337",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.faucetTitle).equal(faucetConfig.faucetTitle, "unexpected response value");
    expect(apiResponse.faucetHtml).to.contain(walletManager.getFaucetAddress(), "unexpected response value");
  });

  it("check /api/getFaucetConfig (with session)", async () => {
    let webApi = new FaucetWebApi();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });

    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetConfig?cliver=0.0.1337&session=" + testSession.getSessionId(),
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.faucetTitle).equal(faucetConfig.faucetTitle, "unexpected response value");
  });

  it("check /api/startSession", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/startSession",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      addr: "0x0000000000000000000000000000000000001337"
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("claimable", "unexpected response session status");
  });

  it("check /api/startSession (behind proxy)", async () => {
    faucetConfig.httpProxyCount = 2
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/startSession",
      remoteAddr: "8.8.8.8",
      headers: {
        "x-forwarded-for": "1.2.3.4, 2.2.2.2, 3.3.3.3",
      },
    }), Buffer.from(JSON.stringify({
      addr: "0x0000000000000000000000000000000000001337"
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("claimable", "unexpected response session status");

    let sessionData = await ServiceManager.GetService(SessionManager).getSessionData(apiResponse.session);
    expect(!!sessionData).equal(true, "session not found");
    expect(sessionData.remoteIP).equal("2.2.2.2", "session remote ip mismatch");
  });

  it("check /api/startSession (invalid method)", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "GET",
      url: "/api/startSession",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse instanceof FaucetHttpResponse).equal(true, "unexpected api response type");
    expect(apiResponse.code).equal(405, "unexpected response http code");
    expect(apiResponse.reason).equal("Method Not Allowed", "unexpected response http reason");
  });

  it("check /api/startSession (invalid input data)", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/startSession",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.failedCode).equal("INVALID_ADDR", "unexpected api error code");
  });

  it("check /api/startSession (unexpected error)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      throw "unexpected test error";
    });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/startSession",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      addr: "0x0000000000000000000000000000000000001337"
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.failedCode).equal("INTERNAL_ERROR", "unexpected api error code");
  });

  it("check /api/startSession (unexpected error with data)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      let error = new FaucetError("INTERNAL_ERROR", "some error");
      error.data = { test: "test124" };
      throw error;
    });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/startSession",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      addr: "0x0000000000000000000000000000000000001337"
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.failedCode).equal("INTERNAL_ERROR", "unexpected api error code");
    expect(apiResponse.failedData.test).equal("test124", "unexpected api error data");
  });

  it("check /api/startSession (session failed)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.setSessionFailed("TEST_ERROR", "test failure");
    });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/startSession",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      addr: "0x0000000000000000000000000000000000001337"
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.failedCode).equal("TEST_ERROR", "unexpected api error code");
  });

  it("check /api/getSession", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSession?session=" + testSession.getSessionId(),
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("running", "invalid response: unexpected session status");
    expect(apiResponse.session).equal(testSession.getSessionId(), "invalid response: unexpected session id");
    expect(apiResponse.target).equal("0x0000000000000000000000000000000000001337", "invalid response: unexpected target addr");
  });

  it("check /api/getSession (unknown session)", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSession?session=69c21b43-7c5c-4ced-ac12-2ee12facaf17",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.error).equal("Session not found", "invalid error response");
  });

  it("check /api/getSession (faucet error)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionInfo, 100, "test-task", (session: FaucetSession) => {
      throw new FaucetError("TEST_ERROR", "test error");
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSession?session=" + testSession.getSessionId(),
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("failed", "invalid response status");
    expect(apiResponse.failedCode).equal("TEST_ERROR", "invalid error code");
  });

  it("check /api/getSession (unexpected error)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionInfo, 100, "test-task", (session: FaucetSession) => {
      throw "test error";
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSession?session=" + testSession.getSessionId(),
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("failed", "invalid response status");
    expect(apiResponse.failedCode).equal("INTERNAL_ERROR", "invalid error code");
    expect(apiResponse.failedReason).matches(/test error/, "invalid error reason");
  });

  it("check /api/claimReward", async () => {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/claimReward",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      session: testSession.getSessionId(),
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("claiming", "invalid session status");
    expect(apiResponse.claimStatus).equal("queue", "invalid queue status");
  });

  it("check /api/claimReward (invalid method)", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "GET",
      url: "/api/claimReward",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse instanceof FaucetHttpResponse).equal(true, "unexpected api response type");
    expect(apiResponse.code).equal(405, "unexpected response http code");
    expect(apiResponse.reason).equal("Method Not Allowed", "unexpected response http reason");
  });

  it("check /api/claimReward (invalid input data)", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/claimReward",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      session: "94c63444-9bc1-45b3-a63c-35366de6814a"
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.failedCode).equal("INVALID_SESSION", "unexpected api error code");
  });

  it("check /api/claimReward (faucet error)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionClaim, 100, "test-task", (session: FaucetSession) => {
      throw new FaucetError("TEST_ERROR", "test error");
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/claimReward",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      session: testSession.getSessionId(),
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("failed", "invalid session status");
    expect(apiResponse.failedCode).equal("TEST_ERROR", "invalid error code");
    expect(apiResponse.failedReason).matches(/test error/, "invalid error code");
  });

  it("check /api/claimReward (unexpected error)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionClaim, 100, "test-task", (session: FaucetSession) => {
      throw "test error";
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      method: "POST",
      url: "/api/claimReward",
      remoteAddr: "8.8.8.8"
    }), Buffer.from(JSON.stringify({
      session: testSession.getSessionId(),
    })));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("failed", "invalid session status");
    expect(apiResponse.failedCode).equal("INTERNAL_ERROR", "invalid error code");
    expect(apiResponse.failedReason).matches(/test error/, "invalid error code");
  });

  it("check /api/getSessionStatus (running session)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSessionStatus?session=" + testSession.getSessionId() + "&details=1",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("running", "invalid response: unexpected session status");
    expect(apiResponse.session).equal(testSession.getSessionId(), "invalid response: unexpected session id");
    expect(apiResponse.target).equal("0x0000000000000000000000000000000000001337", "invalid response: unexpected target addr");
    expect(!!apiResponse.details).equal(true, "invalid response: missing details");
  });

  it("check /api/getSessionStatus (claiming session)", async () => {
    faucetConfig.minDropAmount = 10;
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession.getStoreData(), {});
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSessionStatus?session=" + testSession.getSessionId(),
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("claiming", "invalid response: unexpected session status");
    expect(apiResponse.session).equal(testSession.getSessionId(), "invalid response: unexpected session id");
    expect(apiResponse.target).equal("0x0000000000000000000000000000000000001337", "invalid response: unexpected target addr");
    expect(apiResponse.claimStatus).equal("queue", "invalid response: unexpected claim status");
  });

  it("check /api/getSessionStatus (failed session)", async () => {
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test1", 1);
    });
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
    await testSession.setSessionFailed("TEST_ERROR", "test error");
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSessionStatus?session=" + testSession.getSessionId(),
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status).equal("failed", "invalid response: unexpected session status");
    expect(apiResponse.session).equal(testSession.getSessionId(), "invalid response: unexpected session id");
    expect(apiResponse.failedCode).equal("TEST_ERROR", "invalid response: unexpected failedCode");
  });

  it("check /api/getSessionStatus (unknown session)", async () => {
    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getSessionStatus?session=69c21b43-7c5c-4ced-ac12-2ee12facaf17",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse instanceof FaucetHttpResponse).equal(true, "unexpected api response type");
    expect(apiResponse.code).equal(404, "unexpected response http code");
    expect(apiResponse.reason).equal("Session not found", "unexpected response http reason");
  });

  it("check /api/getFaucetStatus", async () => {
    let sessionTime = Math.floor(new Date().getTime() / 1000) - 42;
    await addTestSession({
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: sessionTime,
      status: FaucetSessionStatus.RUNNING,
      tasks: [ {"module":"pow","name":"mining","timeout":sessionTime + 3600} ],
      data: {
        "pow.hashrate": 20,
        "pow.lastNonce": 42,
        "ipinfo.data": {
          status: "success", country: "United States", countryCode: "US",
          region: "Virginia", regionCode: "VA", city: "Ashburn", cityCode: "Ashburn",
          locLat: 39.03, locLon: -77.5, zone: "America/New_York",
          isp: "Google LLC", org: "Google Public DNS", as: "AS15169 Google LLC",
          proxy: false, hosting: true,
        },
      }
    });
    await ServiceManager.GetService(SessionManager).initialize();

    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status.unclaimedBalance).equal("100", "value mismatch: unclaimedBalance");
    expect(apiResponse.status.queuedBalance).equal("0", "value mismatch: queuedBalance");
    expect(apiResponse.sessions.length).equal(1, "value mismatch: sessions.length");
    expect(apiResponse.sessions[0].id).equal("705f5ce0baec58a47344", "value mismatch: session.id");
    expect(apiResponse.sessions[0].start).equal(sessionTime, "value mismatch: session.start");
    expect(apiResponse.sessions[0].target).equal("0x0000000000000000000000000000000000001337", "value mismatch: session.target");
    expect(apiResponse.sessions[0].ip).equal("bce.2a7.116.9f9", "value mismatch: session.ip");
    expect(apiResponse.sessions[0].balance).equal("100", "value mismatch: session.balance");
    expect(apiResponse.sessions[0].nonce).equal(42, "value mismatch: session.nonce");
    expect(apiResponse.sessions[0].status).equal("running", "value mismatch: session.status");
  });

  it("check /api/getFaucetStatus (caching)", async () => {
    let sessionTime = Math.floor(new Date().getTime() / 1000) - 42;
    await addTestSession({
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: sessionTime,
      status: FaucetSessionStatus.RUNNING,
      tasks: [ {"module":"pow","name":"mining","timeout":sessionTime + 3600} ],
      data: {
        "pow.hashrate": 20,
        "pow.lastNonce": 42,
        "ipinfo.data": {
          status: "success", country: "United States", countryCode: "US",
          region: "Virginia", regionCode: "VA", city: "Ashburn", cityCode: "Ashburn",
          locLat: 39.03, locLon: -77.5, zone: "America/New_York",
          isp: "Google LLC", org: "Google Public DNS", as: "AS15169 Google LLC",
          proxy: false, hosting: true,
        },
      }
    });
    await ServiceManager.GetService(SessionManager).initialize();

    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status.unclaimedBalance).equal("100", "value mismatch for 1st call");
    
    (webApi as any).cachedStatusData["faucet"].data.status.unclaimedBalance = "1337";

    apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status.unclaimedBalance).equal("1337", "value mismatch for 2nd call");

    (webApi as any).cachedStatusData["faucet"].time = Math.floor(new Date().getTime() / 1000) - (FAUCETSTATUS_CACHE_TIME + 1);

    apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status.unclaimedBalance).equal("100", "value mismatch for 3rd call");
  });

  it("check /api/getFaucetStatus (valid key)", async () => {
    let sessionTime = Math.floor(new Date().getTime() / 1000) - 42;
    await addTestSession({
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: sessionTime,
      status: FaucetSessionStatus.RUNNING,
      tasks: [ {"module":"pow","name":"mining","timeout":sessionTime + 3600} ],
      data: {
        "pow.hashrate": 20,
        "pow.lastNonce": 42,
        "ipinfo.data": {
          status: "success", country: "United States", countryCode: "US",
          region: "Virginia", regionCode: "VA", city: "Ashburn", cityCode: "Ashburn",
          locLat: 39.03, locLon: -77.5, zone: "America/New_York",
          isp: "Google LLC", org: "Google Public DNS", as: "AS15169 Google LLC",
          proxy: false, hosting: true,
        },
      }
    });
    await ServiceManager.GetService(SessionManager).initialize();

    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetStatus?key=" + sha256(faucetConfig.faucetSecret + "-unmasked"),
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.status.unclaimedBalance).equal("100", "value mismatch: unclaimedBalance");
    expect(apiResponse.status.queuedBalance).equal("0", "value mismatch: queuedBalance");
    expect(apiResponse.sessions.length).equal(1, "value mismatch: sessions.length");
    expect(apiResponse.sessions[0].id).equal("f081154a-3b93-4972-9ae7-b83f3307bb0f", "value mismatch: session.id");
    expect(apiResponse.sessions[0].start).equal(sessionTime, "value mismatch: session.start");
    expect(apiResponse.sessions[0].target).equal("0x0000000000000000000000000000000000001337", "value mismatch: session.target");
    expect(apiResponse.sessions[0].ip).equal("8.8.8.8", "value mismatch: session.ip");
    expect(apiResponse.sessions[0].balance).equal("100", "value mismatch: session.balance");
    expect(apiResponse.sessions[0].nonce).equal(42, "value mismatch: session.nonce");
    expect(apiResponse.sessions[0].status).equal("running", "value mismatch: session.status");
  });

  it("check /api/getFaucetStatus (invalid key)", async () => {
    await ServiceManager.GetService(SessionManager).initialize();

    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getFaucetStatus?key=invalid",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.code).equal(403, "invalid response code");
    expect(apiResponse.reason).equal("Access denied", "invalid response reason");
  });

  it("check /api/getQueueStatus", async () => {
    faucetConfig.minDropAmount = 100;
    let claimTime = Math.floor(new Date().getTime() / 1000);
    let testSession = await addTestSession({
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: claimTime - 42,
      status: FaucetSessionStatus.CLAIMABLE,
    });
    await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession, {});

    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getQueueStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.claims.length).equal(1, "unexpected response value");
    expect(apiResponse.claims[0].status).equal("queue", "unexpected claim status");
    expect(apiResponse.claims[0].session).equal("705f5ce0baec58a47344", "value mismatch: claim.session");
    expect(apiResponse.claims[0].time).equal(claimTime, "value mismatch: claim.time");
    expect(apiResponse.claims[0].target).equal("0x0000000000000000000000000000000000001337", "value mismatch: claim.target");
  });

  it("check /api/getQueueStatus (caching)", async () => {
    faucetConfig.minDropAmount = 100;
    let claimTime = Math.floor(new Date().getTime() / 1000);
    let testSession = await addTestSession({
      sessionId: "f081154a-3b93-4972-9ae7-b83f3307bb0f",
      startTime: claimTime - 42,
      status: FaucetSessionStatus.CLAIMABLE,
    });
    await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession, {});

    let webApi = new FaucetWebApi();
    let apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getQueueStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.claims.length).equal(1, "value mismatch for 1st call");
    
    (webApi as any).cachedStatusData["queue"].data.claims = [];

    apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getQueueStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.claims.length).equal(0, "value mismatch for 2nd call");

    (webApi as any).cachedStatusData["queue"].time = Math.floor(new Date().getTime() / 1000) - (FAUCETSTATUS_CACHE_TIME + 1);

    apiResponse = await webApi.onApiRequest(encodeApiRequest({
      url: "/api/getQueueStatus",
      remoteAddr: "8.8.8.8"
    }));
    expect(!!apiResponse).equal(true, "no api response");
    expect(apiResponse.claims.length).equal(1, "value mismatch for 3rd call");
  });

});