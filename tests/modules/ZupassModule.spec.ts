import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleHookAction, ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { FaucetSession, FaucetSessionStatus } from '../../src/session/FaucetSession.js';
import { FaucetHttpResponse } from '../../src/webserv/FaucetHttpServer.js';
import { IZupassConfig } from '../../src/modules/zupass/ZupassConfig.js';
import { ZupassPCD } from '../../src/modules/zupass/ZupassPCD.js';
import { sleepPromise } from '../../src/utils/PromiseUtils.js';
import { ZupassDB } from '../../src/modules/zupass/ZupassDB.js';


describe("Faucet module: zupass", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({});
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    faucetConfig.modules["zupass"] = {
      enabled: true,
      zupassUrl: "https://zupass.org/",
      zupassApiUrl: "https://api.zupass.org/",
      redirectUrl: "https://faucets.pk910.de/",
      zupassWatermark: "powfaucet challenge",
      zupassExternalNullifier: "powfaucet",
      event: {
        name: "Devconnect 2023",
        eventIds: ["a1c822c4-60bd-11ee-8732-763dbf30819c", "140b208c-6d1d-11ee-8320-126a2f5f3c5e"],
        productIds: [],
      },
      verify: {
        signer: ["05e0c4e8517758da3a26c80310ff2fe65b9f85d89dfc9c80e6d0b6477f88173e", "29ae64b615383a0ebb1bc37b3a642d82d37545f0f5b1444330300e4c4eedba3f"],
      },
      requireLogin: true,
      concurrencyLimit: 1,
      grants: [],
      loginLogo: null,
      loginLabel: "zupass login",
      userLabel: null,
      infoHtml: "zupass info"
    } as IZupassConfig;
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  function getValidPcd() {
    // this is a valid PCD generated for my devconnect ticket :)
    return {
      "id": "08f3ab85-2849-4b9b-a87c-970d14b342cd",
      "claim": {
        "partialTicket": {
          "ticketId": "102c8990-9efc-11ee-85f8-de4e23c7523a",
          "eventId": "a1c822c4-60bd-11ee-8732-763dbf30819c",
          "productId": "6768a2e0-986f-11ee-abf3-126a2f5f3c5c",
          "attendeeSemaphoreId": "13741484094604222573966014497321470030869540832333932860622584807523008667804"
        },
        "watermark": "337635737515449575428187860496846766607298173824839204522817527605290000567",
        "signer":[
          "05e0c4e8517758da3a26c80310ff2fe65b9f85d89dfc9c80e6d0b6477f88173e",
          "29ae64b615383a0ebb1bc37b3a642d82d37545f0f5b1444330300e4c4eedba3f"
        ],
        "validEventIds":[
          "785e8a0e-6734-11ee-b810-a2b83754f6bc",
          "0996f5fa-6736-11ee-a3bd-a2b83754f6bc",
          "f626d630-2f8a-11ee-be83-b2dd9fd377ba",
          "a1c822c4-60bd-11ee-8732-763dbf30819c",
          "3049870c-6cc8-11ee-98f3-7ebd6aca95cd",
          "aebcb892-69e5-11ee-b65e-a2b83754f6bc",
          "7b57a8fc-6bae-11ee-bf2a-9e102a509962",
          "e1423686-6cc7-11ee-98f3-7ebd6aca95cd",
          "140b208c-6d1d-11ee-8320-126a2f5f3c5e"
        ],
        "nullifierHash": "1453430002874639591624883772901011511827714415737702185124492361874364231852",
        "externalNullifier": "436406636072292623482634608279337780777116908402682507662237447074993329383"
      },
      "proof":{
        "pi_a": [
          "9817201909012884395430827012567150362379238508671638764505850984305625038164",
          "2596154944618744496977159836942145170826608436016936844463358172433387533362",
          "1"
        ],
        "pi_b": [
          ["17656789093164305733037037056526659674044557325195302604168642797409784582264","13814016577669853857274722145873501584187668397304277737180681466182407349975"],
          ["12328779357527727520379416500297377534855162802589644097578481298022784697840","5660729295765724845796798134929980134921676688459035771015916110375289415270"],
          ["1","0"]
        ],
        "pi_c": [
          "7195542179845510084575676470153719167790899838447209482141904711493707705763",
          "3982741706039324597928768955071283925868252297390994760620627935244606981245",
          "1"
        ],
        "protocol":"groth16",
        "curve":"bn128"
      },
      "type": "zk-eddsa-event-ticket-pcd"
    };
  }

  function generateTestToken(ticketId: string, productId: string, eventId: string, attendeeId: string): string {
    let pcd: ZupassPCD = ServiceManager.GetService(ModuleManager).getModule<any>("zupass").zupassPCD;
    return pcd.generateFaucetToken({
      ticketId: ticketId,
      productId: productId,
      eventId: eventId,
      attendeeId: attendeeId,
      token: "",
    });
  }

  it("Check client config exports", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    expect(!!clientConfig.modules['zupass']).to.equal(true, "no zupass config exported");
    expect(clientConfig.modules['zupass'].url).to.equal("https://zupass.org/", "client config mismatch: url");
    expect(clientConfig.modules['zupass'].api).to.equal("https://api.zupass.org/", "client config mismatch: api");
    expect(clientConfig.modules['zupass'].redirectUrl).to.equal("https://faucets.pk910.de/", "client config mismatch: redirectUrl");
    expect(!!clientConfig.modules['zupass'].event).to.equal(true, "client config mismatch: event missing");
    expect(clientConfig.modules['zupass'].event.name).to.equal("Devconnect 2023", "client config mismatch: event.name");
    expect(clientConfig.modules['zupass'].event.eventIds[0]).to.equal("a1c822c4-60bd-11ee-8732-763dbf30819c", "client config mismatch: event.eventIds");
    expect(clientConfig.modules['zupass'].event.eventIds[1]).to.equal("140b208c-6d1d-11ee-8320-126a2f5f3c5e", "client config mismatch: event.eventIds");
    expect(clientConfig.modules['zupass'].event.eventIds.length).to.equal(2, "client config mismatch: event.eventIds");
    expect(clientConfig.modules['zupass'].event.productIds.length).to.equal(0, "client config mismatch: event.productIds");
    expect(clientConfig.modules['zupass'].watermark).to.equal("337635737515449575428187860496846766607298173824839204522817527605290000567", "client config mismatch: event.watermark");
    expect(clientConfig.modules['zupass'].nullifier).to.equal("436406636072292623482634608279337780777116908402682507662237447074993329383", "client config mismatch: event.nullifier");
    expect(clientConfig.modules['zupass'].infoHtml).to.matches(/zupass info/, "client config mismatch: infoHtml");
  });

  it("Check database cleanup", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    
    let now = Math.floor((new Date()).getTime() / 1000);
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

    let zupassDb: ZupassDB = ServiceManager.GetService(ModuleManager).getModule<any>("zupass").zupassDb;
    await zupassDb.cleanStore();
  });

  it("Start session with zupass token", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");

    let zupassData = testSession.getSessionData("zupass.data");
    expect(!!zupassData).to.equal(true, "unexpected zupass data in session data: undefined");
    expect(zupassData.ticketId).to.equal("102c8990-9efc-11ee-85f8-de4e23c7523a", "unexpected zupass data in session data: ticketId");
    expect(zupassData.productId).to.equal("6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "unexpected zupass data in session data: productId");
    expect(zupassData.eventId).to.equal("a1c822c4-60bd-11ee-8732-763dbf30819c", "unexpected zupass data in session data: eventId");
    expect(zupassData.attendeeId).to.equal("1", "unexpected zupass data in session data: attendeeId");
  });

  it("Check zupass requirements: missing authentication", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("ZUPASS_REQUIRED", "unexpected error code");
    expect(error?.message).to.matches(/need to authenticate with your zupass account/, "unexpected error message");
  });

  it("Check zupass requirements: invalid token", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1") + "invalid",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("ZUPASS_TOKEN", "unexpected error code");
    expect(error?.message).to.matches(/Invalid zupass login token/, "unexpected error message");
  });

  it("Check zupass grants: limiting grant", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["zupass"] as IZupassConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 1,
      rewardFactor: 2,
      overrideMaxDrop: 2000000000000000000,
      skipModules: ["ipinfo", "ipinfo"]
    }, {
      duration: 3600,
      limitAmount: 0,
      limitCount: 2,
      required: true,
      message: "test_message_4572"
    });
    
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status (1st run)");
    expect(testSession.getDropAmount()).to.equal(2000000000000000000n, "unexpected drop amount (1st run)");
    expect(testSession.getSessionData("skip.modules", []).length).to.equal(1, "unexpected skip.modules count (1st run)");

    
    testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status (2nd run)");
    expect(testSession.getDropAmount()).to.equal(1000000000000000000n, "unexpected drop amount (2nd run)");
    expect(testSession.getSessionData("skip.modules", []).length).to.equal(0, "unexpected skip.modules count (2nd run)");

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("ZUPASS_LIMIT", "unexpected error code");
    expect(error?.message).to.matches(/test_message_4572/, "unexpected error message");
  });

  it("Check zupass grants: count limit", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["zupass"] as IZupassConfig).grants.push({
      duration: 3600,
      limitAmount: 0,
      limitCount: 1,
      required: true,
    });

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status (1st run)");
    expect(testSession.getDropAmount()).to.equal(1000000000000000000n, "unexpected drop amount (1st run)");
    expect(testSession.getSessionData("skip.modules", []).length).to.equal(0, "unexpected skip.modules count (1st run)");

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("ZUPASS_LIMIT", "unexpected error code");
    expect(error?.message).to.matches(/You have already created/, "unexpected error message");
  });

  it("Check zupass grants: amount limit", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["zupass"] as IZupassConfig).grants.push({
      duration: 3600,
      limitAmount: 1000000000000000000,
      limitCount: 0,
      required: true,
    });

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status (1st run)");
    expect(testSession.getDropAmount()).to.equal(1000000000000000000n, "unexpected drop amount (1st run)");
    expect(testSession.getSessionData("skip.modules", []).length).to.equal(0, "unexpected skip.modules count (1st run)");

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("ZUPASS_LIMIT", "unexpected error code");
    expect(error?.message).to.matches(/You have already requested/, "unexpected error message");
  });

  it("Check zupass grants: amount limit, custom error", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["zupass"] as IZupassConfig).grants.push({
      duration: 3600,
      limitAmount: 1000000000000000000,
      limitCount: 0,
      required: true,
      message: "test_message_4574"
    });

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status (1st run)");
    expect(testSession.getDropAmount()).to.equal(1000000000000000000n, "unexpected drop amount (1st run)");
    expect(testSession.getSessionData("skip.modules", []).length).to.equal(0, "unexpected skip.modules count (1st run)");

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("ZUPASS_LIMIT", "unexpected error code");
    expect(error?.message).to.matches(/test_message_4574/, "unexpected error message");
  });

  it("Check zupass concurrency limit", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status (1st run)");

    await sleepPromise(50);

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        zupassToken: generateTestToken("102c8990-9efc-11ee-85f8-de4e23c7523a", "6768a2e0-986f-11ee-abf3-126a2f5f3c5c", "a1c822c4-60bd-11ee-8732-763dbf30819c", "1"),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("ZUPASS_CONCURRENCY_LIMIT", "unexpected error code");
    expect(error?.message).to.matches(/concurrent sessions/, "unexpected error message");
  });

  it("Check authentication callback: missing proof", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback",
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/PROOF_MISSING/, "error code not in response page");
  });

  it("Check authentication callback: invalid pcd type", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "invalid-type",
        "pcd": JSON.stringify(Object.assign(getValidPcd(), {})),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/Invalid Zupass PCD type/, "unexpected message in response page");
  });

  it("Check authentication callback: invalid pcd watermark", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let pcd = getValidPcd();
    pcd.claim.watermark = "something_else";
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/Invalid PCD watermark/, "unexpected message in response page");
  });

  it("Check authentication callback: invalid pcd nullifier", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let pcd = getValidPcd();
    pcd.claim.externalNullifier = "something_else";
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/Invalid PCD nullifier/, "unexpected message in response page");
  });
  
  it("Check authentication callback: missing pcd fields", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let pcd: any = getValidPcd();
    delete pcd.claim.partialTicket["productId"];
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/Missing PCD field/, "unexpected message in response page");
  });

  it("Check authentication callback: invalid pcd signer", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let pcd = getValidPcd();
    pcd.claim.signer = [ "xxx", "yyy" ];
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/invalid signer/, "unexpected message in response page");
  });

  it("Check authentication callback: invalid pcd productId", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    (faucetConfig.modules["zupass"] as any).event.productIds = [ "6768a2e0-986f-11ee-abf3-126a2f5f3c5d" ];

    let pcd = getValidPcd();
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/invalid productId/, "unexpected message in response page");
  });

  it("Check authentication callback: invalid pcd eventId", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let pcd = getValidPcd();
    pcd.claim.partialTicket.eventId = "6768a2e0-986f-11ee-abf3-126a2f5f3c5d";
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/invalid eventId/, "unexpected message in response page");
  });

  it("Check authentication callback: invalid pcd integrity", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let pcd = getValidPcd();
    pcd.claim.partialTicket.eventId = "140b208c-6d1d-11ee-8320-126a2f5f3c5e";
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/INVALID_PCD/, "error code not in response page");
    expect(callbackRsp.body).to.matches(/Failed validating PCD integrity/, "unexpected message in response page");
  });

  it("Check authentication callback: valid pcd", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let pcd = getValidPcd();
    let callbackRsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "GET",
      url: "/api/zupassCallback?proof=" + encodeURIComponent(JSON.stringify({
        "type": "zk-eddsa-event-ticket-pcd",
        "pcd": JSON.stringify(pcd),
      })),
    } as any);
    expect(callbackRsp instanceof FaucetHttpResponse).to.equal(true, "unexpected api response");
    expect(callbackRsp.body).to.matches(/zupass\.AuthResult/, "unexpected response page");
    expect(callbackRsp.body).to.matches(/token/, "token not in response page");
    expect(callbackRsp.body).to.matches(/attendeeId/, "attendeeId not in response page");
  });

});