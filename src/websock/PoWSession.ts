
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
  startTime: Date
  preimage: string;
  balance: number;
  nonce: number;
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
      return (!!session.activeClient && session.sessionId !== ignoreId && session.balance > faucetConfig.verifyMinerMissPenalty);
    });
  }

  public static getAllSessions(): PoWSession[] {
    let sessions: PoWSession[] = [];
    Array.prototype.push.apply(sessions, Object.values(this.activeSessions));
    Array.prototype.push.apply(sessions, Object.values(this.closedSessions));
    return sessions;
  }

  private sessionId: string;
  private startTime: Date;
  private idleTime: Date | null;
  private targetAddr: string;
  private preimage: string;
  private balance: number;
  private claimable: boolean;
  private lastNonce: number;
  private reportedHashRate: number[];
  private activeClient: PoWClient;
  private cleanupTimer: NodeJS.Timeout;
  private sessionStatus: PoWSessionStatus;
  private lastRemoteIp: string;

  public constructor(client: PoWClient, targetAddr: string, recoveryInfo?: IPoWSessionRecoveryInfo) {
    this.idleTime = null;
    this.targetAddr = targetAddr;
    this.claimable = false;
    this.reportedHashRate = [];
    this.sessionStatus = PoWSessionStatus.MINING;
    
    if(recoveryInfo) {
      this.sessionId = recoveryInfo.id;
      this.startTime = recoveryInfo.startTime;
      this.preimage = recoveryInfo.preimage;
      this.balance = recoveryInfo.balance;
      this.lastNonce = recoveryInfo.nonce;
    }
    else {
      this.sessionId = getNewGuid();
      this.startTime = new Date();
      this.preimage = crypto.randomBytes(8).toString('base64');
      this.balance = 0;
      this.lastNonce = 0;
    }

    this.activeClient = client;
    client.setSession(this);
    this.lastRemoteIp = client.getRemoteIP();

    PoWSession.activeSessions[this.sessionId] = this;
    ServiceManager.GetService(PoWStatusLog).emitLog(
      PoWStatusLogLevel.INFO, 
      "Created new session: " + this.sessionId + 
      (recoveryInfo ? " [Recovered: " + (Math.round(weiToEth(this.balance)*1000)/1000) + " ETH, start: " + renderDate(recoveryInfo.startTime, true) + "]" : "") + 
      " (Remote IP: " + this.activeClient.getRemoteIP() + ")"
    );

    let now = Math.floor((new Date()).getTime() / 1000);
    let sessionAge = now - Math.floor(this.startTime.getTime() / 1000);
    let cleanupTime = faucetConfig.powSessionTimeout - sessionAge + 20;
    if(cleanupTime > 0) {
      this.cleanupTimer = setTimeout(() => {
        this.closeSession();
      }, cleanupTime * 1000);
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
        this.balance = faucetConfig.claimMaxAmount;
    }

    if(this.cleanupTimer) {
      clearTimeout(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.setSessionStatus(PoWSessionStatus.CLOSED);
    delete PoWSession.activeSessions[this.sessionId];
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Closed session: " + this.sessionId + (this.claimable ? " (claimable reward: " + (Math.round(weiToEth(this.balance)*1000)/1000) + ")" : ""));

    let now = Math.floor((new Date()).getTime() / 1000);
    let sessionAge = now - Math.floor(this.startTime.getTime() / 1000);
    let cleanupTime = faucetConfig.claimSessionTimeout - sessionAge + 20;
    if(cleanupTime > 0) {
      PoWSession.closedSessions[this.sessionId] = this;
      setTimeout(() => {
        delete PoWSession.closedSessions[this.sessionId];
      }, cleanupTime * 1000);
    }
  }


  public getSessionId(): string {
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

  public getBalance(): number {
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
    if(activeClient) {
      this.idleTime = null;
      this.setSessionStatus(PoWSessionStatus.MINING);
      this.lastRemoteIp = this.activeClient.getRemoteIP();
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Resumed session: " + this.sessionId + " (Remote IP: " + this.activeClient.getRemoteIP() + ")");
    }
    else {
      this.idleTime = new Date();
      this.setSessionStatus(PoWSessionStatus.IDLE);
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Paused session: " + this.sessionId);
    }
  }

  public getLastRemoteIp(): string {
    return this.lastRemoteIp;
  }

  public addBalance(value: number) {
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

  public slashBadSession(reason: PoWSessionSlashReason) {
    let penalty: string = null;
    switch(reason) {
      case PoWSessionSlashReason.MISSED_VERIFICATION:
        let balancePenalty = this.applyBalancePenalty(faucetConfig.verifyMinerMissPenalty);
        penalty = "-" + (Math.round(weiToEth(balancePenalty)*1000)/1000) + "eth";
        break;
      case PoWSessionSlashReason.INVALID_SHARE:
      case PoWSessionSlashReason.INVALID_VERIFICATION:
        this.applyKillPenalty(reason);
        penalty = "killed";
        break;
    }

    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.WARNING, "Slashed session " + this.sessionId + " (reason: " + reason + ", penalty: " + penalty + ")");
  }

  private applyBalancePenalty(penalty: number): number {
    if(this.balance < penalty) {
      penalty = this.balance;
      this.balance = 0;
    }
    else
      this.balance -= penalty;
    
    if(this.activeClient) {
      this.activeClient.sendMessage("updateBalance", {
        balance: this.balance,
        recovery: this.getSignedSession(),
        reason: "verify miss (penalty: " + penalty + ")"
      })
    }

    return penalty;
  }

  private applyKillPenalty(reason: PoWSessionSlashReason) {
    this.setSessionStatus(PoWSessionStatus.SLASHED);
    ServiceManager.GetService(FaucetStore).setSessionMark(this.sessionId, SessionMark.KILLED);
    if(this.activeClient)
      this.activeClient.sendMessage("sessionKill", {
        level: "session",
        message: reason
      });
    this.closeSession();
  }

  public getSignedSession(): string {
    let sessionDict = {
      id: this.sessionId,
      startTime: Math.floor(this.startTime.getTime() / 1000),
      targetAddr: this.targetAddr,
      preimage: this.preimage,
      balance: this.balance,
      claimable: this.claimable,
      nonce: this.lastNonce,
    };
    let sessionStr = Buffer.from(JSON.stringify(sessionDict)).toString('base64');

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.powSessionSecret + "\r\n");
    sessionHash.update(sessionStr);

    return sessionStr + "|" + sessionHash.digest('base64');
  }


}
