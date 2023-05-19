
import * as fs from 'fs';
import * as path from 'path';
import { faucetConfig } from '../common/FaucetConfig';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess';
import { ServiceManager } from '../common/ServiceManager';
import { PoWClient } from '../websock/PoWClient';
import { PoWSession, PoWSessionStatus } from '../websock/PoWSession';
import { ClaimTx, EthWeb3Manager } from './EthWeb3Manager';

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

  private enabled: boolean;
  private statsFile: string;
  private statsTimer: NodeJS.Timer;

  public constructor() {
    if(faucetConfig.faucetStats) {
      this.enabled = true;
      this.statsFile = path.join(faucetConfig.appBasePath, faucetConfig.faucetStats.logfile || "faucet-stats.log");
    }
    else {
      this.enabled = false;
    }

    this.sheduleStatsLoop();
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

  public addSessionStats(session: PoWSession) {
    let ipinfo = session.getLastIpInfo();
    this.addStatsEntry("SESS", {
      st: Math.floor(session.getStartTime().getTime() / 1000),
      ip: session.getLastRemoteIp(),
      to: session.getTargetAddr(),
      val: session.getBalance().toString(),
      hr: Math.round(session.getReportedHashRate()),
      no: session.getLastNonce(),
      loc: ipinfo ? {
        c: ipinfo.countryCode,
        r: ipinfo.regionCode,
        h: ipinfo.hosting ? 1 : undefined,
        p: ipinfo.proxy ? 1 : undefined,
      } : null,
      in: session.getIdent(),
      id: session.getSessionId(),
    });
  }

  public addClaimStats(claim: ClaimTx) {
    this.addStatsEntry("CLAIM", {
      to: claim.target,
      val: claim.amount.toString(),
      sess: claim.session,
    });
  }

  private processFaucetStats() {
    let sessions = PoWSession.getAllSessions(true);
    let idleSessCount = sessions.filter((s) => !s.getActiveClient()).length;
    let hashRate = 0;
    sessions.forEach((s) => {
      if(s.getSessionStatus() !== PoWSessionStatus.MINING)
        return;
      hashRate += s.getReportedHashRate() || 0;
    });
    hashRate = Math.round(hashRate);

    let statsLog = [];
    let ethWeb3Manager = ServiceManager.GetService(EthWeb3Manager);
    statsLog.push("clients: " + PoWClient.getClientCount());
    statsLog.push("sessions: " + sessions.length + " (" + hashRate + " H/s, " + idleSessCount + " idle)");
    statsLog.push("shares: " + this.statShareCount + " (" + ethWeb3Manager.readableAmount(this.statShareRewards) + ")");
    statsLog.push("verify: " + (this.statVerifyCount -  this.statVerifyMisses) + " (reward: " + ethWeb3Manager.readableAmount(this.statVerifyReward) + ", missed: " + this.statVerifyMisses + " / -" + ethWeb3Manager.readableAmount(this.statVerifyPenalty) + ")");
    statsLog.push("claims: " + this.statClaimCount + " (" + ethWeb3Manager.readableAmount(this.statClaimRewards) + ")");
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "# STATS # " + statsLog.join(", "));

    this.addStatsEntry("STATS", {
      cliCnt: PoWClient.getClientCount(),
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

}
