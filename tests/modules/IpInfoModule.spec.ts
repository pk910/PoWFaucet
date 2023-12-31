import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import YAML from 'yaml'
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, returnDelayedPromise } from '../common.js';
import { FetchUtil } from '../../src/utils/FetchUtil.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { IIPInfoConfig } from '../../src/modules/ipinfo/IPInfoConfig.js';


describe("Faucet module: ipinfo", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs({
      "fetch": sinon.stub(FetchUtil, "fetch"),
    });
    loadDefaultTestConfig();
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    await ServiceManager.GetService(FaucetDatabase).initialize();
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  const testIPInfoResponse = {
    "status":"success",
    "country":"United States",
    "countryCode":"US",
    "region":"VA",
    "regionName":"Virginia",
    "city":"Ashburn",
    "zip":"20149",
    "lat":39.03,"lon":-77.5,
    "timezone":"America/New_York",
    "isp":"Google LLC",
    "org":"Google Public DNS",
    "as":"AS15169 Google LLC",
    "asname":"GOOGLE",
    "proxy":false,"hosting":true
  };

  function tmpFile(prefix?: string, suffix?: string, tmpdir?: string): string {
    prefix = (typeof prefix !== 'undefined') ? prefix : 'tmp.';
    suffix = (typeof suffix !== 'undefined') ? suffix : '';
    tmpdir = tmpdir ? tmpdir : os.tmpdir();
    return path.join(tmpdir, prefix + crypto.randomBytes(16).toString('hex') + suffix);
  }

  it("Request IP info on session start", async () => {
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: false,
      restrictions: null,
      restrictionsPattern: {},
      restrictionsFile: null,
    } as IIPInfoConfig;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve(testIPInfoResponse)
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    let ipInfo = testSession.getSessionData("ipinfo.data");
    expect(!!ipInfo).to.equal(true, "no ipinfo object found");
    
  });

  it("Start session with failed IP info request (failed status)", async () => {
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: true,
      restrictions: null,
      restrictionsPattern: {},
      restrictionsFile: null,
    } as IIPInfoConfig;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve({status: "failed"})
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
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
    expect(error?.getCode()).to.equal("INVALID_IPINFO", "unexpected error code");
  });

  it("Start session with failed IP info request (api error)", async () => {
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: true,
      restrictions: null,
      restrictionsPattern: {},
      restrictionsFile: null,
    } as IIPInfoConfig;
    globalStubs["fetch"].returns(returnDelayedPromise(false, "something bad happened"));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
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
    expect(error?.getCode()).to.equal("INVALID_IPINFO", "unexpected error code");
  });

  it("check ipinfo based restriction (no restriction)", async () => {
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: false,
      restrictions: {
        hosting: 100,
        proxy: 50,
        DE: 50,
      },
      restrictionsPattern: {},
      restrictionsFile: null,
    } as IIPInfoConfig;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve(testIPInfoResponse)
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(100n, "unexpected drop amount");
  });

  it("check ipinfo based restriction (50% restriction)", async () => {
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: false,
      restrictions: {
        hosting: 50,
        US: 75,
      },
      restrictionsPattern: {},
      restrictionsFile: null,
    } as IIPInfoConfig;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve(testIPInfoResponse)
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(50n, "unexpected drop amount");
  });

  it("check ipinfo-pattern based restriction (50% restriction)", async () => {
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: false,
      restrictions: null,
      restrictionsPattern: {
        "^.*Google.*$": 50
      },
      restrictionsFile: null,
    } as IIPInfoConfig;
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve(testIPInfoResponse)
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(50n, "unexpected drop amount");
  });

  it("check ipinfo-pattern based restriction (50% restriction, from yaml file)", async () => {
    let patternFile = tmpFile("powfaucet-", "-ipinfo.txt");
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: false,
      restrictions: null,
      restrictionsPattern: {},
      restrictionsFile: {
        refresh: 10,
        yaml: patternFile,
      },
    } as IIPInfoConfig;
    let restrictions = {
      restrictions: [
        {
          pattern: "^.*Google.*$",
          reward: 50,
        }
      ]
    };
    fs.writeFileSync(patternFile, YAML.stringify(restrictions));
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve(testIPInfoResponse)
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(50n, "unexpected drop amount");
  });

  it("check ipinfo-pattern based restriction (50% restriction, from list file)", async () => {
    let patternFile = tmpFile("powfaucet-", "-ipinfo.txt");
    faucetConfig.modules["ipinfo"] = {
      enabled: true,
      apiUrl: "http://test-api-info-check.com/{ip}",
      cacheTime: 86400,
      required: false,
      restrictions: null,
      restrictionsPattern: {},
      restrictionsFile: {
        refresh: 10,
        file: patternFile,
      },
    } as IIPInfoConfig;
    let restrictions = [
      "junk_line",
      "50: ^.*Google.*$"
    ];
    fs.writeFileSync(patternFile, restrictions.join("\n"));
    globalStubs["fetch"].returns(returnDelayedPromise(true, {
      json: () => Promise.resolve(testIPInfoResponse)
    }));
    await ServiceManager.GetService(ModuleManager).initialize();
    let sessionManager = ServiceManager.GetService(SessionManager);
    let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
      addr: "0x0000000000000000000000000000000000001337",
    });
    expect(testSession.getSessionStatus()).to.equal("claimable", "unexpected session status");
    expect(testSession.getDropAmount()).to.equal(50n, "unexpected drop amount");
  });

});