import * as fs from 'fs';
import { faucetConfig, resolveRelativePath } from '../config/FaucetConfig.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { EthWalletManager } from '../eth/EthWalletManager.js';
import { FaucetSession } from '../session/FaucetSession.js';
import { SessionManager } from '../session/SessionManager.js';
import { EthClaimInfo } from '../eth/EthClaimManager.js';
import { ProcessLoadTracker } from '../utils/ProcessLoadTracker.js';

export interface IFaucetStatsConfig {
  logfile: string;
}

export class FaucetStatsLog {
  public statShareCount: number = 0;
  public statShareRewards: bigint = 0n;
  public statVerifyCount: number = 0;
  public statVerifyMisses: number = 0;
  public statVerifyReward: bigint = 0n;
  public statVerifyPenalty: bigint = 0n;
  public statClaimCount: number = 0;
  public statClaimRewards: bigint = 0n;
  public statSlashCount: number = 0;

  private initialized: boolean;
  private enabled: boolean;
  private statsFile: string;
  private statsTimer: NodeJS.Timeout;
  private loadTracker: ProcessLoadTracker;
  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

    if(faucetConfig.faucetStats) {
      this.enabled = true;
      this.statsFile = resolveRelativePath(faucetConfig.faucetStats.logfile || "faucet-stats.log");
    }
    else {
      this.enabled = false;
    }

    this.sheduleStatsLoop();

    this.loadTracker = new ProcessLoadTracker((stats) => {
      setTimeout(() => {
        this.emitSysLoad(stats.cpu, stats.memory, stats.eventLoopLag);
      }, 20);
    });
  }

  public dispose() {
    this.initialized = false;
    this.enabled = false;
    if(this.statsTimer) {
      clearTimeout(this.statsTimer);
      this.statsTimer = null;
    }
    if(this.loadTracker) {
      this.loadTracker.stop();
    }
  }

  private sheduleStatsLoop() {
    let now = (new Date()).getTime();
    let loopInterval = faucetConfig.faucetLogStatsInterval * 1000;
    let loopIndex = Math.floor(now / loopInterval);
    let nextLoopTime = (loopIndex + 1) * loopInterval;
    let loopDelay = nextLoopTime - now + 10;
    
    if(this.statsTimer)
      clearTimeout(this.statsTimer);
    this.statsTimer = setTimeout(() => {
      this.statsTimer = null;
      this.processFaucetStats();
      this.sheduleStatsLoop();
    }, loopDelay);
  }

  private addStatsEntry(type: string, data: any) {
    if(!this.enabled)
      return;
    let now = Math.floor((new Date()).getTime() / 1000);
    let entry = type + " " + now + " " + JSON.stringify(data) + "\n";
    fs.appendFileSync(this.statsFile, entry);
  }

  public addSessionStats(session: FaucetSession) {
    let ipinfo = session.getSessionData("ipinfo.data");
    let boostinfo = session.getSessionData("passport.score");
    this.addStatsEntry("SESS", {
      st: session.getStartTime(),
      ip: session.getRemoteIP(),
      to: session.getTargetAddr(),
      val: session.getDropAmount().toString(),
      hr: Math.round(session.getSessionData("pow.hashrate") || 0),
      no: session.getSessionData("pow.lastNonce") || 0,
      loc: ipinfo ? {
        c: ipinfo.countryCode,
        r: ipinfo.regionCode,
        h: ipinfo.hosting ? 1 : undefined,
        p: ipinfo.proxy ? 1 : undefined,
      } : null,
      in: session.getSessionData("captcha.ident"),
      id: session.getSessionId(),
      ps: boostinfo ? boostinfo.score : 0,
      pf: boostinfo ? boostinfo.factor : 1,
    });
  }

  public addClaimStats(claim: EthClaimInfo) {
    this.statClaimCount++;
    this.statClaimRewards += BigInt(claim.amount);
    this.addStatsEntry("CLAIM", {
      to: claim.target,
      val: claim.amount.toString(),
      sess: claim.session,
    });
  }

  private processFaucetStats() {
    let sessions = ServiceManager.GetService(SessionManager).getActiveSessions();
    let idleSessCount = sessions.filter((s) => !s.getSessionModuleRef("pow.clientActive")).length;
    let hashRate = 0;
    let cliCount = sessions.length - idleSessCount;
    sessions.forEach((s) => {
      hashRate += s.getSessionData("pow.hashrate") || 0;
    });
    hashRate = Math.round(hashRate);

    let statsLog = [];
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    statsLog.push("clients: " + cliCount);
    statsLog.push("sessions: " + sessions.length + " (" + hashRate + " H/s, " + idleSessCount + " idle)");
    statsLog.push("shares: " + this.statShareCount + " (" + ethWalletManager.readableAmount(this.statShareRewards) + ")");
    statsLog.push("verify: " + (this.statVerifyCount -  this.statVerifyMisses) + " (reward: " + ethWalletManager.readableAmount(this.statVerifyReward) + ", missed: " + this.statVerifyMisses + " / -" + ethWalletManager.readableAmount(this.statVerifyPenalty) + ")");
    statsLog.push("claims: " + this.statClaimCount + " (" + ethWalletManager.readableAmount(this.statClaimRewards) + ")");
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "# STATS # " + statsLog.join(", "));

    this.addStatsEntry("STATS", {
      cliCnt: cliCount,
      sessCnt: sessions.length,
      sessIdl: idleSessCount,
      hashRate: hashRate,
      shareCnt: this.statShareCount,
      shareVal: this.statShareRewards.toString(),
      vrfyCnt: this.statVerifyCount,
      vrfyMisa: this.statVerifyMisses,
      vrfyVal: this.statVerifyReward.toString(),
      vrfyPen: this.statVerifyPenalty.toString(),
      claimCnt: this.statClaimCount,
      claimVal: this.statClaimRewards.toString(),
      slashCnt: this.statSlashCount,
    });

    this.statShareCount = 0;
    this.statShareRewards = 0n;
    this.statVerifyCount = 0;
    this.statVerifyMisses = 0;
    this.statVerifyReward = 0n;
    this.statVerifyPenalty = 0n;
    this.statClaimCount = 0;
    this.statClaimRewards = 0n;
    this.statSlashCount = 0;
  }

  public emitSysLoad(cpu: number, memory: {heapUsed: number, heapTotal: number}, eventLoopLag: number) {
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, 
      ProcessLoadTracker.formatLoadStats(
        "Faucet Process",
        { timestamp: Math.floor(Date.now() / 1000), cpu, eventLoopLag, memory }
      )
    );
  }

}
