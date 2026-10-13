import 'mocha';
import { expect } from 'chai';
import Web3 from 'web3';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleHookAction, ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { FaucetSession, FaucetSessionStatus } from '../../src/session/FaucetSession.js';
import { sleepPromise } from '../../src/utils/PromiseUtils.js';
import { ITicketProofConfig } from '../../src/modules/ticket-proof/TicketProofConfig.js';
import { TicketProofModule } from '../../src/modules/ticket-proof/TicketProofModule.js';
import { ITicketProof, parseTicketProof, ticketProofPayloadHash, verifyTicketProof } from '../../src/modules/ticket-proof/TicketProofVerifier.js';


describe("Faucet module: ticket-proof", () => {
  let globalStubs;
  let web3 = new Web3();
  let signer = web3.eth.accounts.create();
  let otherSigner = web3.eth.accounts.create();
  const DOMAIN = "devcon-ticket-proof-v1";
  const IDENTIFIER = "0x" + "ab".repeat(32);

  beforeEach(async () => {
    globalStubs = bindTestStubs({});
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    faucetConfig.modules["ticket-proof"] = {
      enabled: true,
      signerAddress: signer.address,
      domain: DOMAIN,
      version: 1,
      partner: "powfaucet",
      events: ["devcon-8"],
      tiers: [],
      appUrl: "https://app.devcon.org/ticket",
      appLabel: "Devcon App",
      tokenValidity: 0,
      requireLogin: true,
      concurrencyLimit: 1,
      grants: [],
      loginLogo: null,
      loginLabel: "ticket login",
      userLabel: null,
      infoHtml: "ticket info"
    } as ITicketProofConfig;
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  /** mint a proof the way the event app does: abi.encode, keccak256, EIP-191 sign */
  function mintProof(overrides?: Partial<ITicketProof>, privateKey?: string): ITicketProof {
    let proof: ITicketProof = Object.assign({
      version: 1,
      identifier: IDENTIFIER,
      tier: "standard",
      partner: "powfaucet",
      event: "devcon-8",
      exp: Math.floor(Date.now() / 1000) + 1800,
      signature: "",
    }, overrides || {});
    let hash = ticketProofPayloadHash(DOMAIN, proof);
    proof.signature = web3.eth.accounts.sign(hash, privateKey || signer.privateKey).signature;
    return proof;
  }

  function proofParams(proof: ITicketProof): {[key: string]: string} {
    return {
      v: proof.version.toString(),
      id: proof.identifier,
      tier: proof.tier,
      partner: proof.partner,
      event: proof.event,
      exp: proof.exp.toString(),
      sig: proof.signature,
    };
  }

  async function loginWithProof(proof: ITicketProof): Promise<any> {
    return await ServiceManager.GetService(FaucetWebApi).onApiRequest({
      method: "POST",
      url: "/api/ticketProofLogin",
    } as any, Buffer.from(JSON.stringify(proofParams(proof))));
  }

  function generateTestToken(identifier: string, tier: string, event: string, issuedAt?: number): string {
    let module: TicketProofModule = ServiceManager.GetService(ModuleManager).getModule<any>("ticket-proof");
    return module.getTicketToken().generate({
      identifier: identifier,
      tier: tier,
      event: event,
      issuedAt: issuedAt || Math.floor(Date.now() / 1000),
    });
  }

  it("Check client config exports", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    expect(!!clientConfig.modules['ticket-proof']).to.equal(true, "no ticket-proof config exported");
    expect(clientConfig.modules['ticket-proof'].partner).to.equal("powfaucet", "client config mismatch: partner");
    expect(clientConfig.modules['ticket-proof'].events[0]).to.equal("devcon-8", "client config mismatch: events");
    expect(clientConfig.modules['ticket-proof'].appUrl).to.equal("https://app.devcon.org/ticket", "client config mismatch: appUrl");
    expect(clientConfig.modules['ticket-proof'].appLabel).to.equal("Devcon App", "client config mismatch: appLabel");
    expect(clientConfig.modules['ticket-proof'].loginLabel).to.equal("ticket login", "client config mismatch: loginLabel");
    expect(clientConfig.modules['ticket-proof'].infoHtml).to.matches(/ticket info/, "client config mismatch: infoHtml");
    expect(clientConfig.modules['ticket-proof'].signerAddress).to.equal(undefined, "signer address must not be published to the client");
  });

  it("Loads without signer or partner but refuses every proof", async () => {
    (faucetConfig.modules["ticket-proof"] as ITicketProofConfig).signerAddress = null;
    await ServiceManager.GetService(ModuleManager).initialize();
    let module: TicketProofModule = ServiceManager.GetService(ModuleManager).getModule<any>("ticket-proof");
    expect(module.isEnabled()).to.equal(true, "module not enabled");
    let rsp = await loginWithProof(mintProof());
    expect(rsp.errorCode).to.equal("PROOF_NOT_CONFIGURED", "unexpected response: " + JSON.stringify(rsp));
  });

  describe("Proof verification", () => {
    const options = () => ({
      signerAddress: signer.address,
      domain: DOMAIN,
      version: 1,
      partner: "powfaucet",
      events: ["devcon-8"],
      tiers: [],
    });

    it("accepts a proof from the pinned signer", () => {
      let verdict = verifyTicketProof(mintProof(), options());
      expect(verdict.valid).to.equal(true, "proof not accepted: " + JSON.stringify(verdict));
    });

    it("accepts the signer address regardless of case", () => {
      let verdict = verifyTicketProof(mintProof(), Object.assign(options(), { signerAddress: signer.address.toLowerCase() }));
      expect(verdict.valid).to.equal(true, "proof not accepted: " + JSON.stringify(verdict));
    });

    it("rejects a proof from another signer", () => {
      let verdict = verifyTicketProof(mintProof({}, otherSigner.privateKey), options());
      expect(verdict.valid).to.equal(false, "proof accepted");
      expect((verdict as any).code).to.equal("PROOF_SIGNATURE", "unexpected code");
    });

    it("rejects a tampered field", () => {
      let proof = mintProof();
      proof.tier = "india";
      let verdict = verifyTicketProof(proof, options());
      expect(verdict.valid).to.equal(false, "proof accepted");
      expect((verdict as any).code).to.equal("PROOF_SIGNATURE", "unexpected code");
    });

    it("rejects an expired proof", () => {
      let verdict = verifyTicketProof(mintProof({ exp: Math.floor(Date.now() / 1000) - 10 }), options());
      expect(verdict.valid).to.equal(false, "proof accepted");
      expect((verdict as any).code).to.equal("PROOF_EXPIRED", "unexpected code");
    });

    it("rejects another partner, event, tier or version", () => {
      expect((verifyTicketProof(mintProof({ partner: "ens" }), options()) as any).code).to.equal("PROOF_PARTNER");
      expect((verifyTicketProof(mintProof({ event: "devconnect-arg" }), options()) as any).code).to.equal("PROOF_EVENT");
      expect((verifyTicketProof(mintProof({ tier: "india" }), Object.assign(options(), { tiers: ["standard"] })) as any).code).to.equal("PROOF_TIER");
      expect((verifyTicketProof(mintProof({ version: 2 }), options()) as any).code).to.equal("PROOF_VERSION");
    });

    it("accepts any event when none is configured", () => {
      let verdict = verifyTicketProof(mintProof({ event: "devconnect-arg" }), Object.assign(options(), { events: [] }));
      expect(verdict.valid).to.equal(true, "proof not accepted: " + JSON.stringify(verdict));
    });

    it("parses the query string shape and rejects malformed fields", () => {
      let proof = mintProof();
      let parsed = parseTicketProof(proofParams(proof));
      expect(parsed).to.deep.equal(proof, "round trip mismatch");
      expect(parseTicketProof(Object.assign(proofParams(proof), { id: "0x1234" }))).to.equal(null, "short identifier accepted");
      expect(parseTicketProof(Object.assign(proofParams(proof), { sig: "0x1234" }))).to.equal(null, "short signature accepted");
      expect(parseTicketProof(Object.assign(proofParams(proof), { exp: "soon" }))).to.equal(null, "non-numeric exp accepted");
      let missing = proofParams(proof);
      delete missing.partner;
      expect(parseTicketProof(missing)).to.equal(null, "missing partner accepted");
    });
  });

  describe("Login endpoint", () => {
    it("swaps a valid proof for a login token", async () => {
      await ServiceManager.GetService(ModuleManager).initialize();
      let rsp = await loginWithProof(mintProof());
      expect(!!rsp.data).to.equal(true, "no data in response: " + JSON.stringify(rsp));
      expect(rsp.data.identifier).to.equal(IDENTIFIER, "unexpected identifier");
      expect(rsp.data.tier).to.equal("standard", "unexpected tier");
      expect(rsp.data.event).to.equal("devcon-8", "unexpected event");
      expect(typeof rsp.data.token).to.equal("string", "no token");

      let module: TicketProofModule = ServiceManager.GetService(ModuleManager).getModule<any>("ticket-proof");
      let parsed = module.getTicketToken().parse(rsp.data.token);
      expect(parsed?.identifier).to.equal(IDENTIFIER, "token does not parse back");
    });

    it("accepts the proof as query parameters", async () => {
      await ServiceManager.GetService(ModuleManager).initialize();
      let params = proofParams(mintProof());
      let query = Object.keys(params).map((key) => key + "=" + encodeURIComponent(params[key])).join("&");
      let rsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
        method: "GET",
        url: "/api/ticketProofLogin?" + query,
      } as any);
      expect(!!rsp.data).to.equal(true, "no data in response: " + JSON.stringify(rsp));
    });

    it("rejects a proof from another signer", async () => {
      await ServiceManager.GetService(ModuleManager).initialize();
      let rsp = await loginWithProof(mintProof({}, otherSigner.privateKey));
      expect(rsp.errorCode).to.equal("PROOF_SIGNATURE", "unexpected response: " + JSON.stringify(rsp));
    });

    it("rejects an expired proof", async () => {
      await ServiceManager.GetService(ModuleManager).initialize();
      let rsp = await loginWithProof(mintProof({ exp: Math.floor(Date.now() / 1000) - 10 }));
      expect(rsp.errorCode).to.equal("PROOF_EXPIRED", "unexpected response: " + JSON.stringify(rsp));
    });

    it("rejects a missing proof", async () => {
      await ServiceManager.GetService(ModuleManager).initialize();
      let rsp = await ServiceManager.GetService(FaucetWebApi).onApiRequest({
        method: "POST",
        url: "/api/ticketProofLogin",
      } as any, Buffer.from("{}"));
      expect(rsp.errorCode).to.equal("PROOF_INVALID", "unexpected response: " + JSON.stringify(rsp));
    });
  });

  describe("Login token", () => {
    it("rejects a tampered token", async () => {
      await ServiceManager.GetService(ModuleManager).initialize();
      let module: TicketProofModule = ServiceManager.GetService(ModuleManager).getModule<any>("ticket-proof");
      let token = generateTestToken(IDENTIFIER, "standard", "devcon-8");
      expect(module.getTicketToken().parse(token)?.tier).to.equal("standard", "token does not parse");
      expect(module.getTicketToken().parse(token.substring(0, token.length - 8) + "AAAAAAAA")).to.equal(null, "tampered token accepted");
      expect(module.getTicketToken().parse("not a token")).to.equal(null, "garbage token accepted");
    });
  });

  it("Check database cleanup", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
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

    let module: TicketProofModule = ServiceManager.GetService(ModuleManager).getModule<any>("ticket-proof");
    await module.getTicketDb().cleanStore();
  });

  it("Start session with ticket token", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "india", "devcon-8"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");

    let ticketData = testSession.getSessionData("ticketproof.data");
    expect(!!ticketData).to.equal(true, "no ticket data in session data");
    expect(ticketData.identifier).to.equal(IDENTIFIER, "unexpected identifier in session data");
    expect(ticketData.tier).to.equal("india", "unexpected tier in session data");
    expect(ticketData.event).to.equal("devcon-8", "unexpected event in session data");
  });

  it("Check login requirements: missing authentication", async () => {
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
    expect(error?.getCode()).to.equal("TICKETPROOF_REQUIRED", "unexpected error code");
  });

  it("Check login requirements: optional authentication", async () => {
    (faucetConfig.modules["ticket-proof"] as ITicketProofConfig).requireLogin = false;
    await ServiceManager.GetService(ModuleManager).initialize();
    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getSessionData("ticketproof.data")).to.equal(undefined, "unexpected ticket data");
  });

  it("Check login requirements: invalid token", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        ticketProofToken: "invalid",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error?.getCode()).to.equal("TICKETPROOF_TOKEN", "unexpected error code");
  });

  it("Check login requirements: expired token", async () => {
    (faucetConfig.modules["ticket-proof"] as ITicketProofConfig).tokenValidity = 3600;
    await ServiceManager.GetService(ModuleManager).initialize();
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8", Math.floor(Date.now() / 1000) - 7200),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error?.getCode()).to.equal("TICKETPROOF_TOKEN_EXPIRED", "unexpected error code");
  });

  it("Check grant: count limit (required)", async () => {
    (faucetConfig.modules["ticket-proof"] as ITicketProofConfig).grants = [{
      limitAmount: 0,
      limitCount: 1,
      duration: 86400,
      rewardFactor: 2,
      required: true,
    }];
    await ServiceManager.GetService(ModuleManager).initialize();

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status (1st session)");
    expect(testSession.getSessionData("ticketproof.factor")).to.equal(2, "reward factor not applied");
    await sleepPromise(50);

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error?.getCode()).to.equal("TICKETPROOF_LIMIT", "unexpected error code");

    // another ticket is unaffected
    let otherSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken("0x" + "cd".repeat(32), "standard", "devcon-8"),
    });
    expect(otherSession.getSessionStatus()).to.equal("claimable", "unexpected session status (other ticket)");
  });

  it("Check grant: count limit (optional perk)", async () => {
    (faucetConfig.modules["ticket-proof"] as ITicketProofConfig).grants = [{
      limitAmount: 0,
      limitCount: 1,
      duration: 86400,
      rewardFactor: 2,
      skipModules: ["recurring-limits"],
    }];
    await ServiceManager.GetService(ModuleManager).initialize();

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
    });
    expect(testSession.getSessionData("ticketproof.factor")).to.equal(2, "reward factor not applied (1st session)");
    expect(testSession.getSessionData("skip.modules")).to.deep.equal(["recurring-limits"], "skip modules not applied (1st session)");
    await sleepPromise(50);

    let secondSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
    });
    expect(secondSession.getSessionStatus()).to.equal("claimable", "unexpected session status (2nd session)");
    expect(secondSession.getSessionData("ticketproof.factor")).to.equal(undefined, "reward factor applied beyond the limit");
  });

  it("Check grant: amount limit (optional perk)", async () => {
    (faucetConfig.modules["ticket-proof"] as ITicketProofConfig).grants = [{
      limitAmount: 1000,
      limitCount: 0,
      duration: 86400,
      rewardFactor: 3,
    }];
    await ServiceManager.GetService(ModuleManager).initialize();

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
    });
    expect(testSession.getSessionData("ticketproof.factor")).to.equal(3, "reward factor not applied (1st session)");
    await sleepPromise(50);
    await ServiceManager.GetService(FaucetDatabase).updateSession(Object.assign(testSession.getStoreData(), {
      status: FaucetSessionStatus.FINISHED,
      dropAmount: "1500",
    }));

    let secondSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
    });
    expect(secondSession.getSessionStatus()).to.equal("claimable", "unexpected session status (2nd session)");
    expect(secondSession.getSessionData("ticketproof.factor")).to.equal(undefined, "reward factor applied beyond the amount limit");
  });

  it("Check grant: tier filter", async () => {
    (faucetConfig.modules["ticket-proof"] as ITicketProofConfig).grants = [{
      tiers: ["india"],
      limitAmount: 0,
      limitCount: 0,
      duration: 86400,
      rewardFactor: 5,
    }];
    await ServiceManager.GetService(ModuleManager).initialize();

    let standardSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
    });
    expect(standardSession.getSessionData("ticketproof.factor")).to.equal(undefined, "tier-filtered grant applied to standard tier");
    await sleepPromise(50);

    let indiaSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken("0x" + "cd".repeat(32), "india", "devcon-8"),
    });
    expect(indiaSession.getSessionData("ticketproof.factor")).to.equal(5, "tier-filtered grant not applied to india tier");
  });

  it("Check concurrency limit", async () => {
    await ServiceManager.GetService(ModuleManager).initialize();
    ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
      session.addBlockingTask("test", "test", 1);
    });

    let testSession = await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
    });
    expect(testSession.getSessionStatus()).to.equal("running", "unexpected session status (1st run)");
    await sleepPromise(50);

    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(SessionManager).createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        ticketProofToken: generateTestToken(IDENTIFIER, "standard", "devcon-8"),
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error?.getCode()).to.equal("TICKETPROOF_CONCURRENCY_LIMIT", "unexpected error code");
  });

});
