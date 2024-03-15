import 'mocha';
import sinon from 'sinon';
import { expect } from 'chai';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import YAML from 'yaml'
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from '../common.js';
import { ServiceManager } from '../../src/common/ServiceManager.js';
import { FaucetDatabase } from '../../src/db/FaucetDatabase.js';
import { ModuleManager } from '../../src/modules/ModuleManager.js';
import { SessionManager } from '../../src/session/SessionManager.js';
import { faucetConfig } from '../../src/config/FaucetConfig.js';
import { IRecurringLimitsConfig } from '../../src/modules/recurring-limits/RecurringLimitsConfig.js';
import { FaucetError } from '../../src/common/FaucetError.js';
import { IWhitelistConfig } from '../../src/modules/whitelist/WhitelistConfig.js';
import { FaucetProcess } from '../../src/common/FaucetProcess.js';


describe("Faucet module: whitelist", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
    await ServiceManager.GetService(FaucetDatabase).initialize();
    faucetConfig.maxDropAmount = 100;
    faucetConfig.minDropAmount = 10;
    faucetConfig.modules["whitelist"] = {
      enabled: true,
      whitelistPattern: {},
      whitelistFile: null,
    } as IWhitelistConfig;
    faucetConfig.modules["recurring-limits"] = {
      enabled: true,
      limits: [
        {
          duration: 30,
          limitCount: 1,
        }
      ]
    } as IRecurringLimitsConfig;
  });
  afterEach(async () => {
    let dbService = ServiceManager.GetService(FaucetDatabase);
    await ServiceManager.DisposeAllServices();
    await dbService.closeDatabase();
    await unbindTestStubs(globalStubs);
  });

  async function runTestSession(expectedStatus?: string): Promise<bigint> {
    let sessionManager = ServiceManager.GetService(SessionManager);
    let sessionStatus: string;
    let dropAmount: bigint = 0n;
    try {
      let testSession = await sessionManager.createSession("::ffff:8.8.8.8", {
        addr: "0x0000000000000000000000000000000000001337",
      });
      sessionStatus = testSession.getSessionStatus();
      dropAmount = testSession.getDropAmount();
    } catch(ex) {
      sessionStatus = "failed";
    }
    expect(sessionStatus).to.equal(expectedStatus || "claimable", "unexpected session status");
    return dropAmount;
  }

  function tmpFile(prefix?: string, suffix?: string, tmpdir?: string): string {
    prefix = (typeof prefix !== 'undefined') ? prefix : 'tmp.';
    suffix = (typeof suffix !== 'undefined') ? suffix : '';
    tmpdir = tmpdir ? tmpdir : os.tmpdir();
    return path.join(tmpdir, prefix + crypto.randomBytes(16).toString('hex') + suffix);
  }

  it("Recurring sessions from whitelited ip (skip recurring-limits)", async () => {
    (faucetConfig.modules["whitelist"] as IWhitelistConfig).whitelistPattern["^8\\.8\\.8\\.8$"] = {
      skipModules: [ "recurring-limits" ]
    };
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 1");
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 2");
  });

  it("Session from whitelited ip (half reward)", async () => {
    (faucetConfig.modules["whitelist"] as IWhitelistConfig).whitelistPattern["^8\\.8\\.8\\.8$"] = {
      reward: 50,
    };
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(50n, "unexpected drop amount: session 1");
    expect(await runTestSession("failed")).to.equal(0n, "unexpected drop amount: session 2");
  });

  it("Session from non-whitelited ip (full reward)", async () => {
    (faucetConfig.modules["whitelist"] as IWhitelistConfig).whitelistPattern["^8\\.8\\.4\\.4$"] = {
      reward: 50,
    };
    let moduleManager = ServiceManager.GetService(ModuleManager);
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 1");
    expect(await runTestSession("failed")).to.equal(0n, "unexpected drop amount: session 2");
  });

  it("Load whitelist from single yaml file", async () => {
    let moduleManager = ServiceManager.GetService(ModuleManager);
    let whitelistFile = tmpFile("powfaucet-", "-whitelist.txt");
    (faucetConfig.modules["whitelist"] as IWhitelistConfig).whitelistFile = {
      yaml: whitelistFile,
      refresh: 10,
    }
    let whitelist = {
      "restrictions": [
        {
          pattern: "^8\\.8\\.8\\.8$",
          reward: 50,
        },
      ]
    }
    fs.writeFileSync(whitelistFile, YAML.stringify(whitelist));
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(50n, "unexpected drop amount: session 1");
    expect(await runTestSession("failed")).to.equal(0n, "unexpected drop amount: session 2");
  });

  it("Load whitelist from multiple yaml files", async () => {
    let moduleManager = ServiceManager.GetService(ModuleManager);
    let whitelistFile1 = tmpFile("powfaucet-", "-whitelist.txt");
    let whitelistFile2 = tmpFile("powfaucet-", "-whitelist.txt");
    (faucetConfig.modules["whitelist"] as IWhitelistConfig).whitelistFile = {
      yaml: [whitelistFile1, whitelistFile2],
      refresh: 10,
    }
    let whitelist = {
      "restrictions": [
        {
          pattern: "^8\\.8\\.8\\.8$",
          reward: 50,
        },
      ]
    }
    fs.writeFileSync(whitelistFile1, YAML.stringify(whitelist));
    whitelist.restrictions[0].pattern = "^8\\.8\\.4\\.4$";
    fs.writeFileSync(whitelistFile2, YAML.stringify(whitelist));
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(50n, "unexpected drop amount: session 1");
    expect(await runTestSession("failed")).to.equal(0n, "unexpected drop amount: session 2");
  });

  it("Reload whitelist on config refresh", async () => {
    let moduleManager = ServiceManager.GetService(ModuleManager);
    let whitelistFile = tmpFile("powfaucet-", "-whitelist.txt");
    (faucetConfig.modules["whitelist"] as IWhitelistConfig).whitelistFile = {
      yaml: whitelistFile,
      refresh: 10,
    }
    let whitelist = {
      "restrictions": [
        {
          pattern: "^8\\.8\\.8\\.8$",
          reward: 50,
          skipModules: [ "recurring-limits" ]
        },
      ]
    }
    await moduleManager.initialize();
    expect(await runTestSession()).to.equal(100n, "unexpected drop amount: session 1");

    fs.writeFileSync(whitelistFile, YAML.stringify(whitelist));
    ServiceManager.GetService(FaucetProcess).emit("reload");
    expect(await runTestSession()).to.equal(50n, "unexpected drop amount: session 2");
  });

});