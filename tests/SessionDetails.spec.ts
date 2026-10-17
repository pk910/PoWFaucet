import 'mocha';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { FaucetDatabase } from '../src/db/FaucetDatabase.js';
import { ModuleManager } from '../src/modules/ModuleManager.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { FaucetSessionStatus, FaucetSessionStoreData } from '../src/session/FaucetSession.js';
import { FaucetWebApi } from '../src/webserv/FaucetWebApi.js';
import { FaucetHttpResponse } from '../src/webserv/FaucetHttpServer.js';
import { publicRewardFactors } from '../src/webserv/api/faucetStatus.js';
import { sha256 } from '../src/utils/CryptoUtils.js';
import { getNewGuid } from '../src/utils/GuidUtils.js';
import { IncomingMessage } from 'http';

/**
 * What a session's status and details hand out to whom: anyone with the session id gets the
 * public set, the operator's key gets everything.
 */
describe("Session details and status visibility", () => {
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

  function operatorKey(): string {
    return sha256(faucetConfig.faucetSecret + "-unmasked");
  }

  function apiRequest(url: string): IncomingMessage {
    return {
      url: url,
      method: "GET",
      headers: {},
      socket: { remoteAddress: "8.8.8.8" },
    } as any;
  }

  /** a finished session with everything a visitor could leave behind */
  async function addRichSession(extraData?: any): Promise<FaucetSessionStoreData> {
    let now = Math.floor(Date.now() / 1000);
    let session: FaucetSessionStoreData = {
      sessionId: getNewGuid(),
      startTime: now - 3600,
      status: FaucetSessionStatus.FINISHED,
      dropAmount: "1904400000000000000",
      remoteIP: "198.51.100.7",
      targetAddr: "0x0000000000000000000000000000000000001337",
      tasks: [],
      data: Object.assign({
        "cliver": "2.5.2",
        "close.time": now - 60,
        "pow.lastNonce": 5802,
        "pow.shareCount": 5802,
        "pow.hashrate": 1203,
        "pow.preimage": "0x6e1c0000000000000000000000000000000000000000000000000000a90f",
        "pow.idleTime": now - 120,
        "captcha.ident": "hc:3f9a-c21d",
        "ipinfo.data": { status: "success", country: "United States", countryCode: "US", region: "Virginia", regionCode: "VA", city: "Ashburn", cityCode: "Ashburn", isp: "Amazon", org: "AWS", as: "AS14618", proxy: false, hosting: true },
        "ipinfo.restriction.data": { reward: 60, messages: [], blocked: false },
        "passport.score": { score: 24.5, factor: 1.5 },
        "passport.data": { stamps: [{ provider: "Google" }, { provider: "Github" }] },
        "github.user": "pk910",
        "github.uid": 1234567,
        "ticketproof.data": { identifier: "0xabc", tier: "builder", event: "devcon-8" },
        "skip.modules": ["captcha"],
        "reward.factors": [
          { factor: 1.5, module: "passport" },
          { factor: 0.8, module: "recurring-limits" },
          { factor: 0.6, module: "ipinfo", name: "hosting" },
        ],
      }, extraData || {}),
      claim: {
        claimIdx: 2,
        claimStatus: "confirmed",
        claimTime: now - 30,
        txHash: "0x" + "9f".repeat(32),
        txBlock: 3834217,
        txNonce: 7,
        txHex: "0xf86c0785" + "00".repeat(60),
        txError: null,
      } as any,
    };
    await ServiceManager.GetService(FaucetDatabase).updateSession(session);
    await ServiceManager.GetService(SessionManager).initialize();
    return session;
  }

  describe("publicRewardFactors", () => {
    it("keeps boosts and global factors", () => {
      let factors = [
        { factor: 1.5, module: "passport" },
        { factor: 0.5, module: "faucet-balance" },
        { factor: 0.9, module: "faucet-outflow" },
      ];
      expect(publicRewardFactors(factors)).to.deep.equal(factors);
    });

    it("drops the whole list when a session-specific factor is below 1", () => {
      expect(publicRewardFactors([
        { factor: 1.5, module: "passport" },
        { factor: 0.6, module: "ipinfo", name: "hosting" },
      ])).to.equal(undefined, "a restriction leaked");
      expect(publicRewardFactors([
        { factor: 0.8, module: "recurring-limits" },
      ])).to.equal(undefined, "a recurring limit leaked");
    });

    it("passes nothing through as nothing", () => {
      expect(publicRewardFactors(undefined)).to.equal(undefined);
      expect(publicRewardFactors([])).to.deep.equal([]);
    });
  });

  describe("/api/getSessionStatus?details=1", () => {
    it("hands anyone with the session id the public set only", async () => {
      let session = await addRichSession();
      let webApi = new FaucetWebApi();
      let rsp = await webApi.onApiRequest(apiRequest("/api/getSessionStatus?session=" + session.sessionId + "&details=1"));
      expect(rsp instanceof FaucetHttpResponse).to.equal(false, "unexpected error response");
      expect(rsp.status).to.equal("finished");
      expect(rsp.claimHash).to.equal(session.claim.txHash, "the claim hash is public");

      let data = rsp.details.data;
      expect(data["cliver"]).to.equal("2.5.2");
      expect(data["pow.lastNonce"]).to.equal(5802);
      expect(data["pow.shareCount"]).to.equal(5802);
      expect(data["close.time"]).to.equal(session.data["close.time"]);
      expect(data["passport.score"]).to.deep.equal({ score: 24.5, factor: 1.5 });
      expect(data["github.user"]).to.equal("pk910");
      expect(data["ticketproof.data"]).to.deep.equal({ tier: "builder", event: "devcon-8" }, "the ticket identifier is not public");

      for(let key of ["captcha.ident", "pow.preimage", "pow.idleTime", "ipinfo.data", "ipinfo.restriction.data", "passport.data", "github.uid", "skip.modules"])
        expect(data[key], key + " leaked into the public details").to.equal(undefined);
      expect(data["reward.factors"], "the factor list leaked a restriction").to.equal(undefined);
      expect(rsp.details.ip, "the ip leaked into the public details").to.equal(undefined);
      expect(rsp.details.claim.txHex, "the signed transaction leaked").to.equal(undefined);
      expect(rsp.details.claim.txHash).to.equal(session.claim.txHash);
      expect(rsp.details.claim.txBlock).to.equal(3834217);
    });

    it("lists the factors publicly when none of them is a session-specific penalty", async () => {
      let session = await addRichSession({
        "reward.factors": [
          { factor: 1.5, module: "passport" },
          { factor: 0.5, module: "faucet-balance" },
        ],
      });
      let webApi = new FaucetWebApi();
      let rsp = await webApi.onApiRequest(apiRequest("/api/getSessionStatus?session=" + session.sessionId + "&details=1"));
      expect(rsp.details.data["reward.factors"]).to.deep.equal([
        { factor: 1.5, module: "passport" },
        { factor: 0.5, module: "faucet-balance" },
      ]);
    });

    it("hands the operator everything, the ip included", async () => {
      let session = await addRichSession();
      let webApi = new FaucetWebApi();
      let rsp = await webApi.onApiRequest(apiRequest("/api/getSessionStatus?session=" + session.sessionId + "&details=1&key=" + operatorKey()));
      expect(rsp instanceof FaucetHttpResponse).to.equal(false, "unexpected error response");
      expect(rsp.details.ip).to.equal("198.51.100.7");
      expect(rsp.details.data["captcha.ident"]).to.equal("hc:3f9a-c21d");
      expect(rsp.details.data["pow.preimage"]).to.equal(session.data["pow.preimage"]);
      expect(rsp.details.data["ipinfo.restriction.data"]).to.deep.equal({ reward: 60, messages: [], blocked: false });
      expect(rsp.details.data["reward.factors"].length).to.equal(3);
      expect(rsp.details.claim.txHex).to.equal(session.claim.txHex);
    });

    it("refuses a wrong key instead of answering with the public set", async () => {
      let session = await addRichSession();
      let webApi = new FaucetWebApi();
      let rsp = await webApi.onApiRequest(apiRequest("/api/getSessionStatus?session=" + session.sessionId + "&details=1&key=guess"));
      expect(rsp instanceof FaucetHttpResponse).to.equal(true, "no error response");
      expect(rsp.code).to.equal(403);
    });

    it("stays the same without the details flag", async () => {
      let session = await addRichSession();
      let webApi = new FaucetWebApi();
      let rsp = await webApi.onApiRequest(apiRequest("/api/getSessionStatus?session=" + session.sessionId));
      expect(rsp.details).to.equal(undefined);
      expect(rsp.target).to.equal(session.targetAddr);
    });
  });

  describe("/api/getFaucetStatus session list", () => {
    it("shows no restriction, no penalised factors and only the country without the key", async () => {
      let session = await addRichSession();
      let webApi = new FaucetWebApi();
      let rsp = await webApi.onApiRequest(apiRequest("/api/getFaucetStatus"));
      let row = rsp.sessions.find((s) => s.target === session.targetAddr);
      expect(!!row).to.equal(true, "session row missing");
      expect(row.id).to.not.equal(session.sessionId, "the real id is public");
      expect(row.ip).to.not.equal(session.remoteIP, "the real ip is public");
      expect(row.restr, "the restriction is public").to.equal(undefined);
      expect(row.factors, "the penalised factor list is public").to.equal(undefined);
      expect(row.ipInfo).to.deep.equal({ status: "success", country: "United States", countryCode: "US" });
      expect(row.boost).to.deep.equal({ score: 24.5, factor: 1.5 }, "the boost stays public");
    });

    it("shows everything with the key", async () => {
      let session = await addRichSession();
      let webApi = new FaucetWebApi();
      let rsp = await webApi.onApiRequest(apiRequest("/api/getFaucetStatus?key=" + operatorKey()));
      let row = rsp.sessions.find((s) => s.id === session.sessionId);
      expect(!!row).to.equal(true, "session row missing");
      expect(row.ip).to.equal(session.remoteIP);
      expect(row.restr.reward).to.equal(60);
      expect(row.factors.length).to.equal(3);
      expect(row.ipInfo.isp).to.equal("Amazon");
    });
  });
});
