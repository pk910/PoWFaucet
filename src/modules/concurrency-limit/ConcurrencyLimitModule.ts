import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IConcurrencyLimitConfig } from './ConcurrencyLimitConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { SessionManager } from "../../session/SessionManager.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";

export class ConcurrencyLimitModule extends BaseModule<IConcurrencyLimitConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;

  protected override startModule(): Promise<void> {
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 6, "Recurring limits check",
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionIpChange, 6, "Recurring limits check",
      (session: FaucetSession) => this.processSessionStart(session)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    if(session.getSessionData<string[]>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    this.checkLimit(session);
  }

  private checkLimit(session: FaucetSession): void {
    if(this.moduleConfig.concurrencyLimit === 0)
      return;

    const activeSessions = ServiceManager.GetService(SessionManager).getActiveSessions();

    const sessionsFromTheSameUser = activeSessions.filter((sess) => {
      return sess !== session && (sess.getRemoteIP() === session.getRemoteIP() || sess.getTargetAddr() === session.getTargetAddr() || sess.getUserId() === session.getUserId())
    });

    const sessCount = sessionsFromTheSameUser.length;

    if(sessCount >= this.moduleConfig.concurrencyLimit) {
      const sessionsFromTheSameUserData = sessionsFromTheSameUser.map((s => ({
        ip: s.getRemoteIP(),
        addr: s.getTargetAddr(),
        userId: s.getUserId()
      })))

      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, `Concurrency limit met. IP ${session.getRemoteIP()}, address: ${session.getTargetAddr()}, userId: ${session.getUserId()}. Active sessions: ${JSON.stringify(sessionsFromTheSameUserData)}`);
      throw new FaucetError(
        "CONCURRENCY_LIMIT",
          "Only " + this.moduleConfig.concurrencyLimit + " concurrent sessions allowed per user",
      );
    }
  }

}
