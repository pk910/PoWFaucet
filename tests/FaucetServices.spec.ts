import 'mocha';
import { expect } from 'chai';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import { bindTestStubs, unbindTestStubs, loadDefaultTestConfig, awaitSleepPromise } from './common.js';
import { ServiceManager } from '../src/common/ServiceManager.js';
import { ModuleHookAction, ModuleManager } from '../src/modules/ModuleManager.js';
import { SessionManager } from '../src/session/SessionManager.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { FaucetSession, FaucetSessionStatus } from '../src/session/FaucetSession.js';
import { IIPInfo } from '../src/modules/ipinfo/IPInfoResolver.js';
import { FaucetStatsLog } from '../src/services/FaucetStatsLog.js';
import { ClaimTxStatus, EthClaimManager } from '../src/eth/EthClaimManager.js';
import { FaucetStatus, FaucetStatusLevel } from '../src/services/FaucetStatus.js';


describe("Faucet Services", () => {
  let globalStubs;

  beforeEach(async () => {
    globalStubs = bindTestStubs();
    loadDefaultTestConfig();
  });
  afterEach(async () => {
    if(faucetConfig.faucetStats?.logfile && fs.existsSync(faucetConfig.faucetStats.logfile))
     fs.unlinkSync(faucetConfig.faucetStats.logfile);
    await ServiceManager.DisposeAllServices();
    await unbindTestStubs(globalStubs);
  });

  function tmpFile(prefix?: string, suffix?: string, tmpdir?: string): string {
    prefix = (typeof prefix !== 'undefined') ? prefix : 'tmp.';
    suffix = (typeof suffix !== 'undefined') ? suffix : '';
    tmpdir = tmpdir ? tmpdir : os.tmpdir();
    return path.join(tmpdir, prefix + crypto.randomBytes(16).toString('hex') + suffix);
  }

  describe("Stats Log", () => {
    it("Check session stats processing", async () => {
      faucetConfig.faucetLogStatsInterval = 1;
      faucetConfig.maxDropAmount = 100000;
      faucetConfig.minDropAmount = 10000;
      faucetConfig.faucetStats = {
        logfile: tmpFile("powfaucet-", "-stats.txt"),
      };
      let statsLog = ServiceManager.GetService(FaucetStatsLog);
      statsLog.initialize();
      await ServiceManager.GetService(ModuleManager).initialize();
      let sessionManager = ServiceManager.GetService(SessionManager);
      ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
        session.addBlockingTask("test", "test1", 1);
      });
      let testSession = await sessionManager.createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
      expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.RUNNING, "unexpected session status");
      testSession.setSessionData("ipinfo.data", {
        status: "success",
        countryCode: "US",
        regionCode: "TEST",
        hosting: true,
        proxy: false,
      } as IIPInfo);
      testSession.setSessionData("passport.score", {
        score: 42,
        factor: 2,
      });
      testSession.setSessionData("pow.hashrate", 123);
      testSession.setSessionData("pow.lastNonce", 1337);
      testSession.setSessionData("captcha.ident", "test123");
      testSession.resolveBlockingTask("test", "test1");
      await testSession.tryProceedSession();
      expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");

      let statsEntries = fs.readFileSync(faucetConfig.faucetStats.logfile, "utf8").split("\n").filter((line) => line.length > 1);
      expect(statsEntries.length).to.equal(1, "unexpected number of stats entries");
      let statsEntry = statsEntries[0].split(" ", 3);
      expect(statsEntry.length).to.equal(3, "unexpected stats entry format");
      expect(statsEntry[0]).to.equal("SESS", "unexpected stats entry type");
      let statsEntryJson = JSON.parse(statsEntry[2]);

      expect(statsEntryJson.st).to.equal(testSession.getStartTime(), "unexpected session stats value: start time");
      expect(statsEntryJson.ip).to.equal("8.8.8.8", "unexpected session stats value: ip address");
      expect(statsEntryJson.to).to.equal("0x0000000000000000000000000000000000001337", "unexpected session stats value: eth address");
      expect(statsEntryJson.val).to.equal("100000", "unexpected session stats value: amount");
      expect(statsEntryJson.hr).to.equal(123, "unexpected session stats value: hashrate");
      expect(statsEntryJson.no).to.equal(1337, "unexpected session stats value: last nonce");
      expect(statsEntryJson.loc?.c).to.equal("US", "unexpected session stats value: location.countryCode");
      expect(statsEntryJson.loc?.r).to.equal("TEST", "unexpected session stats value: location.regionCode");
      expect(statsEntryJson.in).to.equal("test123", "unexpected session stats value: ident");
      expect(statsEntryJson.id).to.equal(testSession.getSessionId(), "unexpected session stats value: session id");
      expect(statsEntryJson.ps).to.equal(42, "unexpected session stats value: passport score");
      expect(statsEntryJson.pf).to.equal(2, "unexpected session stats value: passport factor");
    });

    it("Check claim stats processing", async () => {
      faucetConfig.faucetLogStatsInterval = 1;
      faucetConfig.maxDropAmount = 100000;
      faucetConfig.minDropAmount = 10000;
      faucetConfig.faucetStats = {
        logfile: tmpFile("powfaucet-", "-stats.txt"),
      };
      let statsLog = ServiceManager.GetService(FaucetStatsLog);
      statsLog.initialize();
      await ServiceManager.GetService(ModuleManager).initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
      expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");
      let claim = await ServiceManager.GetService(EthClaimManager).createSessionClaim(testSession.getStoreData(), {});
      expect(claim.claim.claimStatus).to.equal(ClaimTxStatus.QUEUE, "unexpected claim status");
      statsLog.addClaimStats(claim);

      let statsEntries = fs.readFileSync(faucetConfig.faucetStats.logfile, "utf8").split("\n").filter((line) => line.length > 1);
      expect(statsEntries.length).to.equal(2, "unexpected number of stats entries");
      let statsEntry = statsEntries[1].split(" ", 3);
      expect(statsEntry.length).to.equal(3, "unexpected stats entry format");
      expect(statsEntry[0]).to.equal("CLAIM", "unexpected stats entry type");
      let statsEntryJson = JSON.parse(statsEntry[2]);

      expect(statsEntryJson.to).to.equal("0x0000000000000000000000000000000000001337", "unexpected claim stats value: eth address");
      expect(statsEntryJson.val).to.equal("100000", "unexpected claim stats value: amount");
      expect(statsEntryJson.sess).to.equal(testSession.getSessionId(), "unexpected claim stats value: session id");
    });

    it("Check aggregated stats processing", async () => {
      faucetConfig.faucetLogStatsInterval = 1;
      faucetConfig.faucetStats = {
        logfile: tmpFile("powfaucet-", "-stats.txt"),
      };
      let statsLog = ServiceManager.GetService(FaucetStatsLog);
      statsLog.initialize();
      await ServiceManager.GetService(ModuleManager).initialize();
      ServiceManager.GetService(ModuleManager).addActionHook(null, ModuleHookAction.SessionStart, 100, "test-task", (session: FaucetSession, userInput: any) => {
        session.addBlockingTask("test", "test1", 1);
      });
      let testSession1 = await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
      testSession1.setSessionData("pow.hashrate", 123);
      expect(testSession1.getSessionStatus()).to.equal(FaucetSessionStatus.RUNNING, "unexpected session status");
      let testSession2 = await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
      testSession2.setSessionData("pow.hashrate", 100);
      testSession2.setSessionModuleRef("pow.client", true);
      expect(testSession2.getSessionStatus()).to.equal(FaucetSessionStatus.RUNNING, "unexpected session status");
      
      statsLog.statShareCount = 42;
      statsLog.statShareRewards = 133700n;
      statsLog.statVerifyCount = 22;
      statsLog.statVerifyMisses = 20;
      statsLog.statVerifyReward = 13370n;
      statsLog.statVerifyPenalty = 13375n;
      statsLog.statClaimCount = 5;
      statsLog.statClaimRewards = 4242420n;
      statsLog.statSlashCount = 99;
      await awaitSleepPromise(1500, () => statsLog.statShareCount == 0);

      let statsEntries = fs.readFileSync(faucetConfig.faucetStats.logfile, "utf8")?.split("\n").filter((line) => line.length > 1);
      expect(statsEntries.length).to.equal(1, "unexpected number of stats entries");
      let statsEntry = statsEntries[0].split(" ", 3);
      expect(statsEntry.length).to.equal(3, "unexpected stats entry format");
      expect(statsEntry[0]).to.equal("STATS", "unexpected stats entry type");
      let statsEntryJson = JSON.parse(statsEntry[2]);

      expect(statsEntryJson.cliCnt).to.equal(1, "unexpected stats value: cliCnt");
      expect(statsEntryJson.sessCnt).to.equal(2, "unexpected stats value: sessCnt");
      expect(statsEntryJson.sessIdl).to.equal(1, "unexpected stats value: sessIdl");
      expect(statsEntryJson.hashRate).to.equal(223, "unexpected stats value: hashRate");
      expect(statsEntryJson.shareCnt).to.equal(42, "unexpected stats value: shareCnt");
      expect(statsEntryJson.shareVal).to.equal('133700', "unexpected stats value: shareVal");
      expect(statsEntryJson.vrfyCnt).to.equal(22, "unexpected stats value: vrfyCnt");
      expect(statsEntryJson.vrfyMisa).to.equal(20, "unexpected stats value: vrfyMisa");
      expect(statsEntryJson.vrfyVal).to.equal('13370', "unexpected stats value: vrfyVal");
      expect(statsEntryJson.vrfyPen).to.equal('13375', "unexpected stats value: vrfyPen");
      expect(statsEntryJson.claimCnt).to.equal(5, "unexpected stats value: claimCnt");
      expect(statsEntryJson.claimVal).to.equal('4242420', "unexpected stats value: claimVal");
      expect(statsEntryJson.slashCnt).to.equal(99, "unexpected stats value: slashCnt");
    }).timeout(5000);

  });

  describe("Faucet Status", () => {
    it("Check loading status from json file (single line text entry)", async () => {
      faucetConfig.faucetStatus = {
        json: tmpFile("powfaucet-", "-status.txt"),
        refresh: 0.2,
      };
      let statusSvc = ServiceManager.GetService(FaucetStatus);
      statusSvc.initialize();

      let status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(0, "unexpected number of status entries");

      fs.writeFileSync(faucetConfig.faucetStatus.json as string, JSON.stringify("test message 1"));
      await awaitSleepPromise(500, () => statusSvc.getFaucetStatus(undefined).status.length > 0);

      status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(1, "unexpected number of status entries");
      expect(status.status[0].level).to.equal("info", "unexpected faucet status: invalid level in status 1");
      expect(status.status[0].text).to.equal("test message 1", "unexpected faucet status: invalid text in status 1");
    });

    it("Check loading status from json file (single entry)", async () => {
      faucetConfig.faucetStatus = {
        json: tmpFile("powfaucet-", "-status.txt"),
        refresh: 0.2,
      };
      let statusSvc = ServiceManager.GetService(FaucetStatus);
      statusSvc.initialize();

      let status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(0, "unexpected number of status entries");

      let testStatusEntry = {
        "key": "test",
        "prio": 5,
        "text": "Test status.",
        "ishtml": true,
        "level": "warn",
      };
      fs.writeFileSync(faucetConfig.faucetStatus.json as string, JSON.stringify(testStatusEntry));
      await awaitSleepPromise(500, () => statusSvc.getFaucetStatus(undefined).status.length > 0);

      status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(1, "unexpected number of status entries");
      expect(status.status[0].level).to.equal("warn", "unexpected faucet status: invalid level in status 1");
      expect(status.status[0].text).to.equal("Test status.", "unexpected faucet status: invalid text in status 1");
      expect(status.status[0].ishtml).to.equal(true, "unexpected faucet status: invalid ishtml in status 1");
      expect(status.status[0].prio).to.equal(5, "unexpected faucet status: invalid prio in status 1");
    });

    it("Check loading status from json file (array of entries)", async () => {
      faucetConfig.faucetStatus = {
        json: tmpFile("powfaucet-", "-status.txt"),
        refresh: 0.2,
      };
      let statusSvc = ServiceManager.GetService(FaucetStatus);
      statusSvc.initialize();

      let status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(0, "unexpected number of status entries");

      let testStatusEntries = [
        {
          "key": "test2",
          "prio": 5,
          "text": "Test status 2.",
          "ishtml": true,
          "level": "warn",
        },
        {
          "key": "test3",
          "prio": 2,
          "text": "Test3.",
          "level": "error",
          "filter": {
            "lt_version": "1.0.50"
          }
        }
      ];
      fs.writeFileSync(faucetConfig.faucetStatus.json as string, JSON.stringify(testStatusEntries));
      await awaitSleepPromise(500, () => statusSvc.getFaucetStatus(undefined).status.length > 0);

      status = statusSvc.getFaucetStatus("1.0.20");
      expect(status.status.length).to.equal(2, "unexpected number of status entries");
      expect(status.status[0].level).to.equal("error", "unexpected faucet status: invalid level in status 1");
      expect(status.status[0].text).to.equal("Test3.", "unexpected faucet status: invalid text in status 1");
      expect(!!status.status[0].ishtml).to.equal(false, "unexpected faucet status: invalid ishtml in status 1");
      expect(status.status[0].prio).to.equal(2, "unexpected faucet status: invalid prio in status 1");
      expect(status.status[1].level).to.equal("warn", "unexpected faucet status: invalid level in status 2");
      expect(status.status[1].text).to.equal("Test status 2.", "unexpected faucet status: invalid text in status 2");
      expect(status.status[1].ishtml).to.equal(true, "unexpected faucet status: invalid ishtml in status 2");
      expect(status.status[1].prio).to.equal(5, "unexpected faucet status: invalid prio in status 2");
    });

    it("Check loading status from json file (invalid json)", async () => {
      faucetConfig.faucetStatus = {
        json: tmpFile("powfaucet-", "-status.txt"),
        refresh: 0.2,
      };
      let statusSvc = ServiceManager.GetService(FaucetStatus);
      statusSvc.initialize();

      let status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(0, "unexpected number of status entries");

      fs.writeFileSync(faucetConfig.faucetStatus.json as string, "not {] - json ! :>");
      await awaitSleepPromise(500, () => statusSvc.getFaucetStatus(undefined).status.length > 0);

      status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(0, "unexpected number of status entries");
    });

    it("Check status filter: active session", async () => {
      faucetConfig.faucetStatus = {
        json: tmpFile("powfaucet-", "-status.txt"),
      };
      let statusSvc = ServiceManager.GetService(FaucetStatus);
      statusSvc.initialize();
      let statusEntry1 = statusSvc.setFaucetStatus("test1", "Test status 1", FaucetStatusLevel.ERROR, 5);
      statusEntry1.filter = {
        session: true,
      };
      let statusEntry2 = statusSvc.setFaucetStatus("test2", "Test status 2", FaucetStatusLevel.ERROR, 5);
      statusEntry2.filter = {
        session: false,
      };

      let status = statusSvc.getFaucetStatus(undefined);
      expect(status.status.length).to.equal(1, "unexpected number of status entries");
      expect(status.status[0].text).to.equal("Test status 2", "unexpected faucet status: invalid text");
    });

    it("Check status filter: client version", async () => {
      faucetConfig.faucetStatus = {
        json: tmpFile("powfaucet-", "-status.txt"),
      };
      let statusSvc = ServiceManager.GetService(FaucetStatus);
      statusSvc.initialize();
      let statusEntry1 = statusSvc.setFaucetStatus("test1", "Test status 1", FaucetStatusLevel.ERROR, 5);
      statusEntry1.filter = {
        lt_version: "1.0.46",
      };
      let statusEntry2 = statusSvc.setFaucetStatus("test2", "Test status 2", FaucetStatusLevel.ERROR, 5);
      statusEntry2.filter = {
        lt_version: "1.2.5"
      };

      let status = statusSvc.getFaucetStatus("1.0.99");
      expect(status.status.length).to.equal(1, "unexpected number of status entries");
      expect(status.status[0].text).to.equal("Test status 2", "unexpected faucet status: invalid text");
    });

    it("Check status filter: ipinfo.hosting / proxy", async () => {
      faucetConfig.faucetStatus = {
        json: tmpFile("powfaucet-", "-status.txt"),
      };
      let statusSvc = ServiceManager.GetService(FaucetStatus);
      statusSvc.initialize();
      let statusEntry1 = statusSvc.setFaucetStatus("test1", "Test status 1", FaucetStatusLevel.ERROR, 10);
      statusEntry1.filter = {
        hosting: false,
      };
      let statusEntry2 = statusSvc.setFaucetStatus("test2", "Test status 2", FaucetStatusLevel.ERROR, 5);
      statusEntry2.filter = {
        proxy: true
      };
      let statusEntry3 = statusSvc.setFaucetStatus("test3", "Test status 3", FaucetStatusLevel.WARNING, 8);
      statusEntry3.filter = {
        country: ["DE", "US"]
      };

      await ServiceManager.GetService(ModuleManager).initialize();
      let testSession = await ServiceManager.GetService(SessionManager).createSession("8.8.8.8", { addr: "0x0000000000000000000000000000000000001337" });
      expect(testSession.getSessionStatus()).to.equal(FaucetSessionStatus.CLAIMABLE, "unexpected session status");
      testSession.setSessionData("ipinfo.data", {
        status: "success",
        countryCode: "US",
        regionCode: "TEST",
        hosting: true,
        proxy: false,
      } as IIPInfo);

      let status = statusSvc.getFaucetStatus("1.0.99", testSession);
      expect(status.status.length).to.equal(1, "unexpected number of status entries");
    });

  });

  
});
