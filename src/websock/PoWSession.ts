
import * as crypto from "crypto";
import { faucetConfig } from "../common/FaucetConfig";
import { SessionMark } from "../services/FaucetStore";
import { PoWStatusLog, PoWStatusLogLevel } from "../common/PoWStatusLog";
import { ServiceManager } from "../common/ServiceManager";
import { FaucetStore } from "../services/FaucetStore";
import { weiToEth } from "../utils/ConvertHelpers";
import { getNewGuid } from "../utils/GuidUtils";
import { PoWClient } from "./PoWClient";


export enum IPoWSessionSlashReason {
  MISSED_VERIFICATION = "missed_verify",
  INVALID_VERIFICATION = "invalid_verify",
  INVALID_SHARE = "invalid_share",
}

export interface IPoWSessionRecoveryInfo {
  id: string;
  startTime: Date
  preimage: string;
  balance: number;
}

export class PoWSession {
  private static activeSessions: {[sessionId: string]: PoWSession} = {};

  public static getSession(sessionId: string): PoWSession {
    return this.activeSessions[sessionId];
  }

  public static getVerifierSessions(ignoreId?: string): PoWSession[] {
    return Object.values(this.activeSessions).filter((session) => {
      return (!!session.activeClient && session.sessionId !== ignoreId && session.balance > faucetConfig.verifyMinerMissPenalty);
    });
  }


  private sessionId: string;
  private startTime: Date;
  private idleTime: Date | null;
  private targetAddr: string;
  private preimage: string;
  private balance: number;
  private claimable: boolean;
  private lastNonce: number;
  private activeClient: PoWClient;

  public constructor(client: PoWClient, targetAddr: string, recoveryInfo?: IPoWSessionRecoveryInfo) {
    this.idleTime = null;
    this.targetAddr = targetAddr;
    this.claimable = false;
    this.lastNonce = 0;

    if(recoveryInfo) {
      this.sessionId = recoveryInfo.id;
      this.startTime = recoveryInfo.startTime;
      this.preimage = recoveryInfo.preimage;
      this.balance = recoveryInfo.balance;
    }
    else {
      this.sessionId = getNewGuid();
      this.startTime = new Date();
      this.preimage = crypto.randomBytes(8).toString('base64');
      this.balance = 0;
    }

    this.activeClient = client;
    client.setSession(this);

    PoWSession.activeSessions[this.sessionId] = this;
  }

  public closeSession(setMark?: boolean, makeClaimable?: boolean) {
    if(this.activeClient) {
      this.activeClient.setSession(null);
      this.activeClient = null;
    }
    delete PoWSession.activeSessions[this.sessionId];

    if(setMark)
      ServiceManager.GetService(FaucetStore).setSessionMark(this.sessionId, SessionMark.CLOSED);
    
    if(makeClaimable && this.balance >= faucetConfig.claimMinAmount) {
      this.claimable = true;
      if(this.balance > faucetConfig.claimMaxAmount)
        this.balance = faucetConfig.claimMaxAmount;
    }
  }


  public getSessionId(): string {
    return this.sessionId;
  }

  public getStartTime(): Date {
    return this.startTime;
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
  }

  public addBalance(value: number) {
    this.balance += value;
  }

  public slashBadSession(reason: IPoWSessionSlashReason) {
    let penalty: string = null;
    switch(reason) {
      case IPoWSessionSlashReason.MISSED_VERIFICATION:
        let balancePenalty = this.applyBalancePenalty(faucetConfig.verifyMinerMissPenalty);
        penalty = "-" + (Math.round(weiToEth(balancePenalty)*1000)/1000) + "eth";
        break;
      case IPoWSessionSlashReason.INVALID_SHARE:
      case IPoWSessionSlashReason.INVALID_VERIFICATION:
        this.applyKillPenalty(reason);
        penalty = "killed";
        break;
    }

    PoWStatusLog.get().emitLog(PoWStatusLogLevel.WARNING, "Slash Session " + this.sessionId + " (reason: " + reason + ", penalty: " + penalty + ")");
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

  private applyKillPenalty(reason: IPoWSessionSlashReason) {
    ServiceManager.GetService(FaucetStore).setSessionMark(this.sessionId, SessionMark.KILLED);

    delete PoWSession.activeSessions[this.sessionId];
    if(this.activeClient) {
      this.activeClient.sendMessage("sessionKill", reason);
      this.activeClient.setSession(null);
      this.activeClient = null;
    }
  }

  public getSignedSession(): string {
    let sessionDict = {
      id: this.sessionId,
      startTime: Math.floor(this.startTime.getTime() / 1000),
      targetAddr: this.targetAddr,
      preimage: this.preimage,
      balance: this.balance,
      claimable: this.claimable,
    };
    let sessionStr = Buffer.from(JSON.stringify(sessionDict)).toString('base64');

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.powSessionSecret + "\r\n");
    sessionHash.update(sessionStr);

    return sessionStr + "|" + sessionHash.digest('base64');
  }


}
