import { FaucetError } from "../common/FaucetError.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { faucetConfig } from "../config/FaucetConfig.js";
import { FaucetDatabase } from "../db/FaucetDatabase.js";
import { FaucetSession, FaucetSessionStatus, FaucetSessionStoreData } from "./FaucetSession.js";

export class SessionManager {
  private initialized: boolean;
  private faucetSessions: {[sessionId: string]: FaucetSession} = {};
  private cleanupTimer: NodeJS.Timer;
  // the tail of the admission queue: resolves once the last queued admission is through
  private admissionQueue: Promise<void> = Promise.resolve();
  // how long a start waits for its admission turn (ms)
  public admissionTimeout = 30 * 1000;

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

  /**
   * Runs `admit` for one session at a time, in the order the starts asked.
   *
   * A limit check counts the sessions it can see, in memory or in the database, and a session
   * becomes visible only once its start is through. Two starts checking at the same time would
   * both miss the other. The admission of a session (its SessionAdmit hooks, the switch to
   * running and the first save of its row) therefore runs while no other admission does: every
   * session admitted before is visible to the checks of the next.
   *
   * A start that does not get its turn within `admissionTimeout` fails with
   * SESSION_ADMISSION_TIMEOUT; the queue goes on behind it.
   */
  public async runAdmission<T>(admit: () => Promise<T>): Promise<T> {
    let release: () => void;
    let turn = new Promise<void>((resolve) => release = resolve);
    let previous = this.admissionQueue;
    this.admissionQueue = previous.then(() => turn);

    let timer: NodeJS.Timeout;
    let timedOut = await Promise.race([
      previous.then(() => false),
      new Promise<boolean>((resolve) => timer = setTimeout(() => resolve(true), this.admissionTimeout)),
    ]);
    clearTimeout(timer);
    if(timedOut) {
      // giving up the turn early lets nobody skip the admission still running: the next one
      // in the queue waits for that one too
      release();
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Session admission did not get its turn within " + Math.round(this.admissionTimeout / 1000) + "s");
      throw new FaucetError("SESSION_ADMISSION_TIMEOUT", "The faucet is busy right now, please try again in a moment.");
    }

    try {
      return await admit();
    } finally {
      release();
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

  public async createSession(remoteIP: string, userInput: any, overrides?: any): Promise<FaucetSession> {
    let session = new FaucetSession(this);
    await session.startSession(remoteIP, userInput, overrides);
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
