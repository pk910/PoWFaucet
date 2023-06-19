import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";
import { faucetConfig } from "../config/FaucetConfig";
import { FaucetDatabase } from "../db/FaucetDatabase";
import { FaucetSession, FaucetSessionStatus, FaucetSessionStoreData } from "./FaucetSession";

export class SessionManager {
  private initialized: boolean;
  private faucetSessions: {[sessionId: string]: FaucetSession} = {};
  private cleanupTimer: NodeJS.Timer;

  public async initialize(): Promise<void> {
    if(this.initialized)
      return;
    this.initialized = true;

    let storedSessions = await ServiceManager.GetService(FaucetDatabase).getSessions([
      FaucetSessionStatus.RUNNING,
    ]);
    if(storedSessions.length > 0) {
      await Promise.all(storedSessions.map((storedSession) => {
        let session = new FaucetSession(this);
        return session.restoreSession(storedSession);
      }));
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Restored " + storedSessions.length + " sessions from database.");
    }

    this.cleanupTimer = setInterval(() => {
      this.processSessionTimeouts().catch((err) => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error while processing session timeouts: " + err.toString());
      });
    }, 120 * 1000);
  }

  public notifySessionUpdate(session: FaucetSession) {
    switch(session.getSessionStatus()) {
      case FaucetSessionStatus.RUNNING:
        if(!this.faucetSessions[session.getSessionId()])
          this.faucetSessions[session.getSessionId()] = session;
        break;
      default:
        if(this.faucetSessions[session.getSessionId()])
          delete this.faucetSessions[session.getSessionId()];
        break;
    }
  }

  public getSession(sessionId: string, states?: FaucetSessionStatus[]): FaucetSession {
    if(this.faucetSessions[sessionId]) {
      if(!states || states.indexOf(this.faucetSessions[sessionId].getSessionStatus()) !== -1)
        return this.faucetSessions[sessionId];
      else
        return null;
    }
    return undefined;
  }

  public async getSessionData(sessionId: string): Promise<FaucetSessionStoreData> {
    if(this.faucetSessions[sessionId])
      return this.faucetSessions[sessionId].getStoreData()
    return await ServiceManager.GetService(FaucetDatabase).getSession(sessionId);
  }

  public getActiveSessions(): FaucetSession[] {
    return Object.values(this.faucetSessions).filter((session) => session.getSessionStatus() === FaucetSessionStatus.RUNNING);
  }

  public async getUnclaimedBalance(): Promise<bigint> {
    let totalBalance = 0n;
    Object.values(this.faucetSessions).forEach((session) => {
      if(session.getSessionStatus() !== FaucetSessionStatus.CLAIMING)
        totalBalance += session.getDropAmount();
    });
    totalBalance += await ServiceManager.GetService(FaucetDatabase).getClaimableAmount();
    return totalBalance;
  }

  public async createSession(remoteIP: string, userInput: any): Promise<FaucetSession> {
    let session = new FaucetSession(this);
    await session.startSession(remoteIP, userInput);
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "New session for " + session.getTargetAddr() + " (IP: " + session.getRemoteIP() + ", ID: " + session.getSessionId() + ")");
    return session;
  }

  public saveAllSessions(): Promise<void> {
    return Promise.all(Object.values(this.faucetSessions).map((session) => session.saveSession())).then();
  }

  public async processSessionTimeouts(): Promise<void> {
    let faucetDatabase = ServiceManager.GetService(FaucetDatabase);
    let timedOutSessions = await faucetDatabase.getTimedOutSessions(faucetConfig.sessionTimeout);
    if(timedOutSessions.length === 0)
      return;

    for(let i = 0; i < timedOutSessions.length; i++) {
      let timedOutSessionData = timedOutSessions[i];
      let timedOutSession = this.getSession(timedOutSessionData.sessionId);
      if(timedOutSession) {
        await timedOutSession.setSessionFailed("SESSION_TIMEOUT", "Session timed out");
      }
      else {
        timedOutSessionData.data["failed.code"] = "SESSION_TIMEOUT";
        timedOutSessionData.data["failed.reason"] = "Session timed out";
        timedOutSessionData.status = FaucetSessionStatus.FAILED;
        await faucetDatabase.updateSession(timedOutSessionData);
      }
    }

    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Closed " + timedOutSessions.length + " sessions (session timeout)");
  }


}
