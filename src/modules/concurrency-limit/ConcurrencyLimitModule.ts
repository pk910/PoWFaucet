import { ServiceManager } from "../../common/ServiceManager";
import { EthWalletManager } from "../../eth/EthWalletManager";
import { FaucetSession, FaucetSessionStoreData } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { defaultConfig, IConcurrencyLimitConfig } from './ConcurrencyLimitConfig';
import { FaucetError } from '../../common/FaucetError';
import { FaucetDatabase } from "../../db/FaucetDatabase";
import { renderTimespan } from "../../utils/DateUtils";
import { SessionManager } from "../../session/SessionManager";

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
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    this.checkLimit(session);
  }

  private checkLimit(session: FaucetSession): void {
    if(this.moduleConfig.concurrencyLimit === 0)
      return;
    
    let activeSessions = ServiceManager.GetService(SessionManager).getActiveSessions();
    let concurrentSessionCount = 0;
    let concurrentLimitMessage: string = null;

    if(!this.moduleConfig.byAddrOnly) {
      let sessCount = activeSessions.filter((sess) => sess !== session && sess.getRemoteIP() === session.getRemoteIP()).length;
      if(sessCount > concurrentSessionCount) {
        concurrentSessionCount = sessCount;
        concurrentLimitMessage = this.moduleConfig.messageByIP || ("Only " + this.moduleConfig.concurrencyLimit + " concurrent sessions allowed per IP");
      }
    }
    if(!this.moduleConfig.byIPOnly) {
      let sessCount = activeSessions.filter((sess) => sess !== session && sess.getTargetAddr() === session.getTargetAddr()).length;
      if(sessCount > concurrentSessionCount) {
        concurrentSessionCount = sessCount;
        concurrentLimitMessage = this.moduleConfig.messageByAddr || ("Only " + this.moduleConfig.concurrencyLimit + " concurrent sessions allowed per wallet address");
      }
    }

    if(concurrentSessionCount >= this.moduleConfig.concurrencyLimit) {
      throw new FaucetError(
        "CONCURRENCY_LIMIT", 
        concurrentLimitMessage,
      );
    }
  }

}
