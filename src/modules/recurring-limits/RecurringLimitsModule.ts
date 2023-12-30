import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { FaucetSession, FaucetSessionStoreData } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IRecurringLimitConfig, IRecurringLimitsConfig } from './RecurringLimitsConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { renderTimespan } from "../../utils/DateUtils.js";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor.js";

export class RecurringLimitsModule extends BaseModule<IRecurringLimitsConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;

  protected override startModule(): Promise<void> {
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 6, "Recurring limits check", 
      (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 6, "recurring limits factor", 
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    await Promise.all(this.moduleConfig.limits.map((limit) => this.checkLimit(session, limit)));
  }

  private async checkLimit(session: FaucetSession, limit: IRecurringLimitConfig): Promise<void> {
    let finishedSessions: FaucetSessionStoreData[];
    let remoteIp = session.getRemoteIP();
    if(limit.ip4Subnet && remoteIp.match(/^[0-9.]+$/)) {
      let ipParts = remoteIp.split(".").slice(0, limit.ip4Subnet / 8);
      if(ipParts.length < 4) {
        ipParts.push("%");
        remoteIp = ipParts.join(".");
      }
    }

    if(limit.byAddrOnly)
      finishedSessions = await ServiceManager.GetService(FaucetDatabase).getFinishedSessions(session.getTargetAddr(), null, limit.duration, true);
    else if(limit.byIPOnly)
      finishedSessions = await ServiceManager.GetService(FaucetDatabase).getFinishedSessions(null, remoteIp, limit.duration, true);
    else
      finishedSessions = await ServiceManager.GetService(FaucetDatabase).getFinishedSessions(session.getTargetAddr(), remoteIp, limit.duration, true);
    
    let limitApplies = false;
    if(limit.limitCount > 0 && finishedSessions.length >= limit.limitCount) {
      limitApplies = true;
      if(!limit.action || limit.action == "block") {
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
    }
    if(limit.limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach((session) => totalAmount += BigInt(session.dropAmount));
      if(totalAmount >= BigInt(limit.limitAmount)) {
        limitApplies = true;
        if(!limit.action || limit.action == "block") {
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

    if(limitApplies && typeof limit.rewards !== "undefined") {
      let cfactor = session.getSessionData("recurring-limits.factor");
      if(typeof cfactor === "undefined" || limit.rewards < cfactor)
        session.setSessionData("recurring-limits.factor", limit.rewards);
    }
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]) {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let rewardPerc = session.getSessionData("recurring-limits.factor", 100);
    if(rewardPerc !== 100) {
      rewardFactors.push({
        factor: rewardPerc / 100,
        module: this.moduleName,
      });
    }
  }

}
