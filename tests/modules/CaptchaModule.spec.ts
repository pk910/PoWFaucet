import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { ICaptchaConfig } from '../../src/modules/captcha/CaptchaConfig.js';
import { EthClaimManager } from '../../src/eth/EthClaimManager.js';
import { HCaptchaApi } from '../../src/modules/captcha/CaptchaModule.js';
import { FaucetWebApi } from '../../src/webserv/FaucetWebApi.js';
import { FetchUtil } from '../../src/utils/FetchUtil.js';


describe("Faucet module: captcha", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({
      "fetch": sinon.stub(FetchUtil, "fetch"),
      "hcaptcha.verify": sinon.stub(HCaptchaApi, "verify"),
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

  it("Check client config exports", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "hcaptcha",
      siteKey: "test-site-key",
      secret: "test-secret",
      checkSessionStart: true,
      checkBalanceClaim: true,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let clientConfig = ServiceManager.GetService(FaucetWebApi).onGetFaucetConfig();
    expect(!!clientConfig.modules['captcha']).to.equal(true, "no captcha config exported");
    expect(clientConfig.modules['captcha'].provider).to.equal("hcaptcha", "client config mismatch: provider");
    expect(clientConfig.modules['captcha'].siteKey).to.equal("test-site-key", "client config mismatch: siteKey");
    expect(clientConfig.modules['captcha'].requiredForStart).to.equal(true, "client config mismatch: requiredForStart");
    expect(clientConfig.modules['captcha'].requiredForClaim).to.equal(true, "client config mismatch: requiredForClaim");
  });

  it("Require hcaptcha for session start", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "hcaptcha",
      siteKey: "test-site-key",
      secret: "test-secret",
      checkSessionStart: true,
      checkBalanceClaim: false,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["hcaptcha.verify"].returns(Promise.resolve({
      success: true,
    }));
    // create session with token
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      captchaToken: "test-token",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(globalStubs["hcaptcha.verify"].calledWith("test-secret", "test-token", "8.8.8.8", "test-site-key")).to.equal(true, "hcaptcha.verify not called as expected");
    await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession.getStoreData(), {});
    let sessionData = await sessionManager.getSessionData(testSession.getSessionId());
    expect(sessionData?.status).to.equal("claiming", "unexpected session status after claim");
  });

  it("Require recaptcha for session claim", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "recaptcha",
      siteKey: "test-site-key",
      secret: "test-secret",
      checkSessionStart: false,
      checkBalanceClaim: true,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["fetch"].returns(Promise.resolve({
      json: () => Promise.resolve({
        success: true,
      }),
    }));
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status after start");
    await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession.getStoreData(), {
      captchaToken: "test-token",
    });
    let sessionData = await sessionManager.getSessionData(testSession.getSessionId());
    expect(sessionData?.status).to.equal("claiming", "unexpected session status after claim");
    let reqBody = globalStubs["fetch"].getCall(0).args[1].body;
    expect(reqBody.get("secret")).to.equal("test-secret", "fetch not called with test secret");
    expect(reqBody.get("response")).to.equal("test-token", "fetch not called with test token");
  });

  it("Require hcaptcha for session start (missing token)", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "hcaptcha",
      siteKey: "test-site-key",
      secret: "test-secret",
      checkSessionStart: true,
      checkBalanceClaim: false,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["hcaptcha.verify"].returns(Promise.resolve({
      success: true,
    }));
    let error: FaucetError | null = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("INVALID_CAPTCHA", "unexpected error code");
  });

  it("Require hcaptcha for session start (invalid token)", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "hcaptcha",
      siteKey: "test-site-key",
      secret: "test-secret",
      checkSessionStart: true,
      checkBalanceClaim: false,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["hcaptcha.verify"].returns(Promise.resolve({
      success: false,
    }));
    let error: FaucetError | null = null;
    try {
      await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
        captchaToken: "test-token",
      });
    } catch(ex) {
      error = ex;
    }
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("INVALID_CAPTCHA", "unexpected error code");
  });

  it("Require recaptcha for session claim (missing token)", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "recaptcha",
      siteKey: "test-site-key",
      secret: "test-secret",
      checkSessionStart: false,
      checkBalanceClaim: true,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["fetch"].returns(Promise.resolve({
      json: () => Promise.resolve({
        success: true,
      }),
    }));
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status after start");
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession.getStoreData(), {});
    } catch(ex) {
      error = ex;
    }
    let sessionData = await sessionManager.getSessionData(testSession.getSessionId());
    expect(sessionData?.status).to.equal("claimable", "unexpected session status after invalid claim attempt");
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("INVALID_CAPTCHA", "unexpected error code");
  });

  it("Require recaptcha for session claim (invalid token)", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "recaptcha",
      siteKey: "test-site-key",
      secret: "test-secret",
      checkSessionStart: false,
      checkBalanceClaim: true,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["fetch"].returns(Promise.resolve({
      json: () => Promise.resolve({
        success: false,
      }),
    }));
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status after start");
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession.getStoreData(), {
        captchaToken: "test-token",
      });
    } catch(ex) {
      error = ex;
    }
    let sessionData = await sessionManager.getSessionData(testSession.getSessionId());
    expect(sessionData?.status).to.equal("claimable", "unexpected session status after invalid claim attempt");
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("INVALID_CAPTCHA", "unexpected error code");
  });

  it("Require custom captcha for session start", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "custom",
      siteKey: "http://test-client-script-url.com",
      secret: "http://test-verify-url.com",
      checkSessionStart: true,
      checkBalanceClaim: false,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["fetch"].returns(Promise.resolve({
      json: () => Promise.resolve({
        success: true,
        ident: "test-ident",
      }),
    }));
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
      captchaToken: "test-token",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getSessionData("captcha.ident")).to.equal("test-ident", "unexpected session ident");
    let reqBody = globalStubs["fetch"].getCall(0).args[1].body;
    expect(reqBody.get("remoteip")).to.equal("8.8.8.8", "fetch not called with test remote ip");
    expect(reqBody.get("response")).to.equal("test-token", "fetch not called with test token");
  });

  it("Require custom captcha for session claim (invalid token)", async () => {
    faucetConfig.modules["captcha"] = {
      enabled: true,
      provider: "custom",
      siteKey: "http://test-client-script-url.com",
      secret: "http://test-verify-url.com",
      checkSessionStart: false,
      checkBalanceClaim: true,
    } as ICaptchaConfig;
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    globalStubs["fetch"].returns(Promise.resolve({
      json: () => Promise.resolve({
        success: false,
      }),
    }));
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status after start");
    let error: FaucetError | null = null;
    try {
      await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession.getStoreData(), {
        captchaToken: "test-token",
      });
    } catch(ex) {
      error = ex;
    }
    let sessionData = await sessionManager.getSessionData(testSession.getSessionId());
    expect(sessionData?.status).to.equal("claimable", "unexpected session status after invalid claim attempt");
    expect(error).to.not.equal(null, "no exception thrown");
    expect(error instanceof FaucetError).to.equal(true, "unexpected error type");
    expect(error?.getCode()).to.equal("INVALID_CAPTCHA", "unexpected error code");
  });

});