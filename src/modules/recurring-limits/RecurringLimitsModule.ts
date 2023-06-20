import { ServiceManager } from "../../common/ServiceManager";
import { EthWalletManager } from "../../eth/EthWalletManager";
import { FaucetSession, FaucetSessionStoreData } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { defaultConfig, IRecurringLimitConfig, IRecurringLimitsConfig } from './RecurringLimitsConfig';
import { FaucetError } from '../../common/FaucetError';
import { FaucetDatabase } from "../../db/FaucetDatabase";
import { renderTimespan } from "../../utils/DateUtils";

export class RecurringLimitsModule extends BaseModule<IRecurringLimitsConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;

  protected override startModule(): Promise<void> {
    this.moduleManager.addActionHook(this, ModuleHookAction.SessionStart, 6, "Recurring limits check", (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput));
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    await Promise.all(this.moduleConfig.limits.map((limit) => this.checkLimit(session, limit)));
  }

  private async checkLimit(session: FaucetSession, limit: IRecurringLimitConfig): Promise<void> {
    let finishedSessions: FaucetSessionStoreData[];
    if(limit.byAddrOnly)
      finishedSessions = await ServiceManager.GetService(FaucetDatabase).getFinishedSessions(session.getTargetAddr(), null, limit.duration, true);
    else if(limit.byIPOnly)
      finishedSessions = await ServiceManager.GetService(FaucetDatabase).getFinishedSessions(null, session.getRemoteIP(), limit.duration, true);
    else
      finishedSessions = await ServiceManager.GetService(FaucetDatabase).getFinishedSessions(session.getTargetAddr(), session.getRemoteIP(), limit.duration, true);
    
    if(limit.limitCount > 0 && finishedSessions.length >= limit.limitCount) {
      let errMsg = limit.message || [
        "You have already created ",
        finishedSessions.length,
        (finishedSessions.length > 1 ? " sessions" : " session"), 
        " in the last ",
        renderTimespan(limit.duration)
      ].join("");
      throw new FaucetError(
        "RECURRING_LIMIT", 
        errMsg,
      );
    }

    if(limit.limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach((session) => totalAmount += BigInt(session.dropAmount));
      if(totalAmount >= BigInt(limit.limitAmount)) {
        let errMsg = limit.message || [
          "You have already requested ",
          ServiceManager.GetService(EthWalletManager).readableAmount(totalAmount),
          " in the last ",
          renderTimespan(limit.duration)
        ].join("");
        throw new FaucetError(
          "RECURRING_LIMIT", 
          errMsg,
        );
      }
    }
  }

}
