import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import {
  defaultConfig,
  IConcurrencyLimitConfig,
} from "./ConcurrencyLimitConfig.js";
import { FaucetError } from "../../common/FaucetError.js";
import { SessionManager } from "../../session/SessionManager.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";

export class ConcurrencyLimitModule extends BaseModule<IConcurrencyLimitConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;

  protected override startModule(): Promise<void> {
    this.moduleManager.addActionHook(
      this,
      ModuleHookAction.SessionStart,
      6,
      "Recurring limits check",
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this,
      ModuleHookAction.SessionIpChange,
      6,
      "Recurring limits check",
      (session: FaucetSession) => this.processSessionStart(session)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    if (
      session
        .getSessionData<string[]>("skip.modules", [])
        .indexOf(this.moduleName) !== -1
    )
      return;
    this.checkLimit(session);
  }

  private checkLimit(sessionStarting: FaucetSession): void {
    const concurrentLimitByIP = this.moduleConfig.concurrencyLimitByIP;
    const concurrentLimitByUserAndTargetAddress =
      this.moduleConfig.concurrencyLimitByUserAndTargetAddress;

    // Unlimited!
    if (
      concurrentLimitByIP === 0 &&
      concurrentLimitByUserAndTargetAddress === 0
    )
      return;

    // Values of session that we start
    const userId = sessionStarting.getUserId();
    const targetAddr = sessionStarting.getTargetAddr();
    const remoteIP = sessionStarting.getRemoteIP();

    const activeSessions = ServiceManager.GetService(SessionManager)
      .getActiveSessions()
      .filter((activeSession) => {
        return activeSession !== sessionStarting;
      });

    // Limit by IP has been set
    if (concurrentLimitByIP > 0) {
      const sessions = activeSessions.filter((activeSession) => {
        return activeSession.getRemoteIP() === remoteIP;
      });

      // Check if we have more than allowed sessions
      if (sessions.length >= concurrentLimitByIP) {
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.WARNING,
          `Concurrency limit met (by IP). IP ${remoteIP}. Active sessions: ${sessions.map(
            (s) => s.getRemoteIP()
          )}`
        );
        throw new FaucetError(
          "CONCURRENCY_LIMIT",
          "Only " + concurrentLimitByIP + " concurrent sessions allowed per IP"
        );
      }
    }

    // Limit by user and wallet address has been set
    if (concurrentLimitByUserAndTargetAddress > 0) {
      const sessions = activeSessions.filter((activeSession) => {
        return (
          activeSession.getTargetAddr() === targetAddr ||
          activeSession.getUserId() === userId
        );
      });

      // Check if we have more than allowed sessions
      if (sessions.length >= concurrentLimitByUserAndTargetAddress) {
        const sessionsFromTheSameUserData = sessions.map((s) => ({
          addr: s.getTargetAddr(),
          userId: s.getUserId(),
        }));

        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.WARNING,
          `Concurrency limit met (by user + wallet address). IP ${remoteIP}, address: ${targetAddr}, userId: ${userId}. Active sessions: ${JSON.stringify(
            sessionsFromTheSameUserData
          )}`
        );
        throw new FaucetError(
          "CONCURRENCY_LIMIT",
          "Only " +
            concurrentLimitByIP +
            " concurrent sessions allowed per user and wallet address"
        );
      }
    }
  }
}
