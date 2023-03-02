
import * as crypto from "crypto";
import { faucetConfig } from "../common/FaucetConfig";
import { SessionMark } from "../services/FaucetStore";
import { PoWStatusLog, PoWStatusLogLevel } from "../common/PoWStatusLog";
import { ServiceManager } from "../common/ServiceManager";
import { FaucetStore } from "../services/FaucetStore";
import { weiToEth } from "../utils/ConvertHelpers";
import { getNewGuid } from "../utils/GuidUtils";
import { PoWClient } from "./PoWClient";
import { renderDate } from "../utils/DateUtils";
import { IIPInfo, IPInfoResolver } from "../services/IPInfoResolver";
import { FaucetStatsLog } from "../services/FaucetStatsLog";
import { getHashedIp, getHashedSessionId } from "../utils/HashedInfo";
import { PassportVerifier } from "../services/PassportVerifier";


export enum PoWSessionSlashReason {
  MISSED_VERIFICATION = "missed_verify",
  INVALID_VERIFICATION = "invalid_verify",
  INVALID_SHARE = "invalid_share",
}

export enum PoWSessionStatus {
  IDLE = "idle",
  MINING = "mining",
  CLOSED = "closed",
  CLAIMED = "claimed",
  SLASHED = "slashed",
}

export interface IPoWSessionRecoveryInfo {
  id: string;
  startTime: number;
  targetAddr: string;
  preimage: string;
  balance: string;
  nonce: number;
  tokenTime?: number;
  claimable?: boolean;
}

export interface IPoWSessionStoreData {
  id: string;
  startTime: number;
  idleTime: number | null;
  targetAddr: string;
  preimage: string;
  balance: string;
  claimable: boolean;
  lastNonce: number;
  status: PoWSessionStatus;
  remoteIp: string;
  remoteIpInfo: IIPInfo;
}

export interface IPoWSessionBoostInfo {
  stamps: string[];
  score: number;
  factor: number;
}

export class PoWSession {
  private static activeSessions: {[sessionId: string]: PoWSession} = {};
  private static closedSessions: {[sessionId: string]: PoWSession} = {};

  public static getSession(sessionId: string): PoWSession {
    return this.activeSessions[sessionId];
  }

  public static getClosedSession(sessionId: string): PoWSession {
    return this.closedSessions[sessionId];
  }

  public static getVerifierSessions(ignoreId?: string): PoWSession[] {
    return Object.values(this.activeSessions).filter((session) => {
      return (
        !!session.activeClient && 
        session.sessionId !== ignoreId && 
        session.balance > faucetConfig.verifyMinerMissPenalty &&
        session.missedVerifications < faucetConfig.verifyMinerMaxMissed &&
        session.pendingVerifications < faucetConfig.verifyMinerMaxPending
      );
    });
  }

  public static getAllSessions(activeOnly?: boolean): PoWSession[] {
    let sessions: PoWSession[] = [];
    Array.prototype.push.apply(sessions, Object.values(this.activeSessions));
    if(!activeOnly)
      Array.prototype.push.apply(sessions, Object.values(this.closedSessions));
    return sessions;
  }

  public static getConcurrentSessionCount(remoteIp: string, skipSession?: PoWSession): number {
    let concurrentSessions = 0;
    Object.values(this.activeSessions).forEach((session) => {
      if(skipSession && skipSession === session)
        return;
      if(session.activeClient && session.activeClient.getRemoteIP() === remoteIp)
        concurrentSessions++;
    });
    return concurrentSessions;
  }

  public static saveSessionData() {
    let sessionData = this.getAllSessions().map((session) => session.getSessionStoreData());
    ServiceManager.GetService(FaucetStore).setSessionStore(sessionData);
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Persisted session data to faucet store: " + sessionData.length + " sessions");
  }

  public static loadSessionData() {
    let sessionData = ServiceManager.GetService(FaucetStore).getSessionStore();
    if(!sessionData)
      return;
    sessionData.forEach((data) => new PoWSession(null, data));
    ServiceManager.GetService(FaucetStore).setSessionStore(null);
  }

  private sessionId: string;
  private startTime: Date;
  private idleTime: Date | null;
  private targetAddr: string;
  private preimage: string;
  private balance: bigint;
  private claimable: boolean;
  private lastNonce: number;
  private reportedHashRate: number[];
  private activeClient: PoWClient;
  private cleanupTimer: NodeJS.Timeout;
  private idleCloseTimer: NodeJS.Timeout;
  private sessionStatus: PoWSessionStatus;
  private lastRemoteIp: string;
  private lastIpInfo: IIPInfo;
  private missedVerifications: number;
  private pendingVerifications: number;
  private lastBoostRefresh: number;
  private boostInfo: IPoWSessionBoostInfo;

  // cache
  private hashedRemoteIp: string;
  private hashedSessionId: string;

  public constructor(client: PoWClient, target: string | IPoWSessionRecoveryInfo | IPoWSessionStoreData) {
    if(client) {
      this.createSession(client, target as string | IPoWSessionRecoveryInfo);
    }
    else {
      // restore from IPoWSessionStoreData
      this.restoreSessionData(target as IPoWSessionStoreData);
    }
  }

  private createSession(client: PoWClient, target: string | IPoWSessionRecoveryInfo) {
    this.idleTime = null;
    this.claimable = false;
    this.reportedHashRate = [];
    this.sessionStatus = PoWSessionStatus.MINING;
    this.missedVerifications = 0;
    this.pendingVerifications = 0;

    if(typeof target === "object") {
      this.sessionId = target.id;
      this.startTime = new Date(target.startTime * 1000);
      this.targetAddr = target.targetAddr;
      this.preimage = target.preimage;
      this.balance = BigInt(target.balance);
      this.lastNonce = target.nonce;
    }
    else {
      this.sessionId = getNewGuid();
      this.targetAddr = target;
      this.startTime = new Date();
      this.preimage = crypto.randomBytes(8).toString('base64');
      this.balance = 0n;
      this.lastNonce = 0;
    }

    this.activeClient = client;
    client.setSession(this);
    this.updateRemoteIp();

    ServiceManager.GetService(PoWStatusLog).emitLog(
      PoWStatusLogLevel.INFO, 
      "Created new session: " + this.sessionId + 
      (typeof target === "object" ? 
        " [Recovered: " + (Math.round(weiToEth(this.balance)*1000)/1000) + " ETH, start: " + renderDate(this.startTime, true) + "]" :
        ""
      ) +
      " (Remote IP: " + this.activeClient.getRemoteIP() + ")"
    );

    this.resetSessionTimer();
    this.refreshBoostInfo();
  }

  private timeoutSession() {
    let activeClient = this.activeClient;
    this.closeSession(false, true);
    if(activeClient) {
      activeClient.sendMessage("sessionKill", {
        level: "timeout",
        message: "Session timed out.",
        token: this.isClaimable() ? this.getSignedSession() : null,
      });
    }
  }

  public closeSession(setClosedMark?: boolean, makeClaimable?: boolean) {
    if(this.activeClient) {
      this.activeClient.setSession(null);
      this.activeClient = null;
    }
    if(setClosedMark)
      ServiceManager.GetService(FaucetStore).setSessionMark(this.sessionId, SessionMark.CLOSED);
    
    if(makeClaimable && this.balance >= faucetConfig.claimMinAmount) {
      this.claimable = true;
      if(this.balance > faucetConfig.claimMaxAmount)
        this.balance = BigInt(faucetConfig.claimMaxAmount);
    }
    
    this.setSessionStatus(PoWSessionStatus.CLOSED);
    delete PoWSession.activeSessions[this.sessionId];
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Closed session: " + this.sessionId + (this.claimable ? " (claimable reward: " + (Math.round(weiToEth(this.balance)*1000)/1000) + ")" : ""));
    ServiceManager.GetService(FaucetStatsLog).addSessionStats(this);

    this.resetSessionTimer();
  }

  private resetSessionTimer() {
    let now = Math.floor((new Date()).getTime() / 1000);
    let sessionAge = now - Math.floor(this.startTime.getTime() / 1000);

    if(this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    if(this.sessionStatus === PoWSessionStatus.IDLE || this.sessionStatus === PoWSessionStatus.MINING) {
      PoWSession.activeSessions[this.sessionId] = this;

      let cleanupTime = faucetConfig.powSessionTimeout - sessionAge;
      if(cleanupTime > 0) {
        this.cleanupTimer = setTimeout(() => {
          this.timeoutSession();
        }, cleanupTime * 1000);
      }
      else {
        setTimeout(() => {
          this.timeoutSession();
        }, 0);
      }
    }
    else {
      let cleanupTime = faucetConfig.claimSessionTimeout - sessionAge + 20;
      if(cleanupTime > 0) {
        PoWSession.closedSessions[this.sessionId] = this;
        this.cleanupTimer = setTimeout(() => {
          delete PoWSession.closedSessions[this.sessionId];
        }, cleanupTime * 1000);
      }
    }
  }

  private restoreSessionData(data: IPoWSessionStoreData) {
    this.sessionId = data.id;
    this.startTime = new Date(data.startTime);
    this.idleTime = data.idleTime ? new Date(data.idleTime) : null;
    this.targetAddr = data.targetAddr;
    this.preimage = data.preimage;
    this.balance = BigInt(data.balance);
    this.claimable = data.claimable;
    this.lastNonce = data.lastNonce;
    this.sessionStatus = data.status;
    this.lastRemoteIp = data.remoteIp;
    this.lastIpInfo = data.remoteIpInfo;
    this.reportedHashRate = [];

    this.resetSessionTimer();

    if(this.sessionStatus === PoWSessionStatus.MINING) {
      this.sessionStatus = PoWSessionStatus.IDLE;
      this.idleTime = new Date();
    }
    if(this.sessionStatus === PoWSessionStatus.IDLE) {
      this.resetIdleTimeout();
      this.refreshBoostInfo();
    }
  }

  public getSessionStoreData(): IPoWSessionStoreData {
    return {
      id: this.sessionId,
      startTime: this.startTime.getTime(),
      idleTime: this.idleTime?.getTime(),
      targetAddr: this.targetAddr,
      preimage: this.preimage,
      balance: this.balance.toString(),
      claimable: this.claimable,
      lastNonce: this.lastNonce,
      status: this.sessionStatus,
      remoteIp: this.lastRemoteIp,
      remoteIpInfo: this.lastIpInfo
    };
  }


  public getSessionId(hashed?: boolean): string {
    if(hashed) {
      if(!this.hashedSessionId)
        this.hashedSessionId = getHashedSessionId(this.sessionId, faucetConfig.faucetSecret);
      return this.hashedSessionId;
    }
    else
      return this.sessionId;
  }

  public getStartTime(): Date {
    return this.startTime;
  }

  public getIdleTime(): Date | null {
    return this.idleTime;
  }

  public getTargetAddr(): string {
    return this.targetAddr;
  }

  public getPreImage(): string {
    return this.preimage;
  }

  public getLastNonce(): number {
    return this.lastNonce;
  }

  public setLastNonce(lastNonce: number) {
    this.lastNonce = lastNonce;
  }

  public getBalance(): bigint {
    return this.balance;
  }

  public isClaimable(): boolean {
    return this.claimable;
  }

  public getActiveClient(): PoWClient {
    return this.activeClient;
  }

  public setActiveClient(activeClient: PoWClient) {
    this.activeClient = activeClient;
    this.pendingVerifications = 0;
    if(activeClient) {
      this.idleTime = null;
      this.setSessionStatus(PoWSessionStatus.MINING);
      this.updateRemoteIp();
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Resumed session: " + this.sessionId + " (Remote IP: " + this.activeClient.getRemoteIP() + ")");
      
    }
    else {
      this.idleTime = new Date();
      this.setSessionStatus(PoWSessionStatus.IDLE);
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Paused session: " + this.sessionId);
    }
    this.resetIdleTimeout();
  }

  private resetIdleTimeout() {
    if(this.sessionStatus === PoWSessionStatus.IDLE && faucetConfig.powIdleTimeout > 0) {
      if(this.idleCloseTimer) {
        clearTimeout(this.idleCloseTimer);
      }
      this.idleCloseTimer = setTimeout(() => {
        this.closeSession(false, true);
      }, faucetConfig.powIdleTimeout * 1000);
    }
    else if(this.idleCloseTimer) {
      clearTimeout(this.idleCloseTimer);
      this.idleCloseTimer = null;
    }
  }

  public getLastRemoteIp(hashed?: boolean): string {
    if(hashed) {
      if(!this.hashedRemoteIp)
        this.hashedRemoteIp = getHashedIp(this.lastRemoteIp, faucetConfig.faucetSecret);
      return this.hashedRemoteIp;
    }
    else
      return this.lastRemoteIp;
  }

  private updateRemoteIp() {
    if(!this.activeClient)
      return;
    
    let remoteAddr = this.activeClient.getRemoteIP();
    if(remoteAddr.match(/^::ffff:/))
      remoteAddr = remoteAddr.substring(7);
    
    if(this.lastRemoteIp === remoteAddr)
      return;

    this.lastRemoteIp = remoteAddr;
    this.hashedRemoteIp = null;
    ServiceManager.GetService(IPInfoResolver).getIpInfo(remoteAddr).then((ipInfo) => {
      this.lastIpInfo = ipInfo;
      if(this.activeClient)
        this.activeClient.refreshFaucetStatus();
    });
  }

  public getLastIpInfo(): IIPInfo {
    return this.lastIpInfo;
  }

  public addBalance(value: bigint) {
    this.balance += value;
  }

  public reportHashRate(hashRate: number) {
    this.reportedHashRate.push(hashRate);
    if(this.reportedHashRate.length > 5)
      this.reportedHashRate.splice(0, 1);
  }

  public getReportedHashRate(): number {
    let hashRateSum = 0;
    this.reportedHashRate.forEach((hashRate) => hashRateSum += hashRate);
    return this.reportedHashRate.length > 0 ? hashRateSum / this.reportedHashRate.length : 0;
  }

  public getSessionStatus(): PoWSessionStatus {
    return this.sessionStatus;
  }

  public setSessionStatus(status: PoWSessionStatus) {
    if(this.sessionStatus === PoWSessionStatus.SLASHED)
      return;
    this.sessionStatus = status;
  }

  public addMissedVerification() {
    this.missedVerifications++;
  }

  public resetMissedVerifications() {
    this.missedVerifications = 0;
  }

  public addPendingVerification() {
    this.pendingVerifications++;
  }

  public subPendingVerification() {
    if(this.pendingVerifications > 0)
      this.pendingVerifications--;
  }

  public slashBadSession(reason: PoWSessionSlashReason) {
    switch(reason) {
      case PoWSessionSlashReason.MISSED_VERIFICATION:
        this.applyBalancePenalty(faucetConfig.verifyMinerMissPenalty);
        break;
      case PoWSessionSlashReason.INVALID_SHARE:
      case PoWSessionSlashReason.INVALID_VERIFICATION:
        this.applyKillPenalty(reason);
        break;
    }
  }

  private applyBalancePenalty(penalty: number | bigint) {
    if(this.balance < penalty) {
      penalty = this.balance;
      this.balance = 0n;
    }
    else
      this.balance -= BigInt(penalty);
    
    if(this.activeClient) {
      this.activeClient.sendMessage("updateBalance", {
        balance: this.balance.toString(),
        recovery: this.getSignedSession(),
        reason: "verify miss (penalty: " + penalty + ")"
      })
    }

    ServiceManager.GetService(FaucetStatsLog).statVerifyPenalty += BigInt(penalty);
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Slashed session " + this.sessionId + " (reason: verify miss, penalty: -" + (Math.round(weiToEth(penalty)*1000)/1000) + "ETH)");
  }

  private applyKillPenalty(reason: PoWSessionSlashReason) {
    this.setSessionStatus(PoWSessionStatus.SLASHED);
    ServiceManager.GetService(FaucetStore).setSessionMark(this.sessionId, SessionMark.KILLED);
    if(this.activeClient)
      this.activeClient.sendMessage("sessionKill", {
        level: "session",
        message: reason,
        token: null
      });
    this.closeSession();

    ServiceManager.GetService(FaucetStatsLog).statSlashCount++;
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.WARNING, "Slashed session " + this.sessionId + " (reason: " + reason + ", penalty: killed)");
  }

  public getSignedSession(): string {
    let sessionDict: IPoWSessionRecoveryInfo = {
      id: this.sessionId,
      startTime: Math.floor(this.startTime.getTime() / 1000),
      tokenTime: Math.floor((new Date().getTime()) / 1000),
      targetAddr: this.targetAddr,
      preimage: this.preimage,
      balance: this.balance.toString(),
      claimable: this.claimable,
      nonce: this.lastNonce,
    };
    let sessionStr = Buffer.from(JSON.stringify(sessionDict)).toString('base64');

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.faucetSecret + "\r\n");
    sessionHash.update(sessionStr);

    return sessionStr + "|" + sessionHash.digest('base64');
  }

  public getBoostInfo(): IPoWSessionBoostInfo {
    return this.boostInfo;
  }

  public async refreshBoostInfo(refresh?: boolean): Promise<IPoWSessionBoostInfo> {
    if(refresh) {
      let now = Math.floor((new Date()).getTime() / 1000);
      if(this.lastBoostRefresh && now - this.lastBoostRefresh < faucetConfig.passportBoost.refreshCooldown) {
        throw "Passport has been refreshed recently, please retry in a few minutes.";
      }
      this.lastBoostRefresh = now;
    }

    let passportVerifier = ServiceManager.GetService(PassportVerifier);
    let passport = await passportVerifier.getPassport(this.targetAddr, refresh);
    let score = passportVerifier.getPassportScore(passport);
    if(score) {
      this.boostInfo = {
        stamps: passport.stamps,
        score: score.score,
        factor: score.factor
      };
    }
    else {
      this.boostInfo = null;
    }
    return this.boostInfo;
  }

  public getBoostRefreshCooldown(): number {
    let now = Math.floor((new Date()).getTime() / 1000);
    let cooldownUntil = (this.lastBoostRefresh || 0) + faucetConfig.passportBoost.refreshCooldown;
    return cooldownUntil > now ? cooldownUntil : 0;
  }


}
