import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import {
  FaucetSession,
  ISessionStartUserInput,
} from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import {
  defaultConfig,
  IRecurringLimitConfig,
  IRecurringLimitsConfig,
} from "./RecurringLimitsConfig.js";
import { FaucetError } from "../../common/FaucetError.js";
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { renderTimespan } from "../../utils/DateUtils.js";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor.js";

export class RecurringLimitsModule extends BaseModule<IRecurringLimitsConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;

  protected override startModule(): Promise<void> {
    this.moduleManager.addActionHook(
      this,
      ModuleHookAction.SessionStart,
      6,
      "Recurring limits check",
      (session: FaucetSession, userInput: ISessionStartUserInput) =>
        this.processSessionStart(session, userInput)
    );
    this.moduleManager.addActionHook(
      this,
      ModuleHookAction.SessionRewardFactor,
      6,
      "recurring limits factor",
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) =>
        this.processSessionRewardFactor(session, rewardFactors)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private async processSessionStart(
    session: FaucetSession,
    _userInput: ISessionStartUserInput
  ): Promise<void> {
    if (
      session
        .getSessionData<string[]>("skip.modules", [])
        .indexOf(this.moduleName) !== -1
    )
      return;
    await Promise.all(
      this.moduleConfig.limits.map((limit) =>
        this.checkSessionLimit(session, limit)
      )
    );
  }

  private async checkSessionLimit(
    session: FaucetSession,
    config: IRecurringLimitConfig
  ): Promise<void> {
    const remoteIP = session.getRemoteIP();
    const targetAddr = session.getTargetAddr();
    const userId = session.getUserId();
    const { rewards } = config;

    const limitApplies = await this.checkLimit(
      {
        remoteIP,
        targetAddr,
        userId,
      },
      config,
      config.action
    );

    if (limitApplies && typeof rewards !== "undefined") {
      const cfactor = session.getSessionData("recurring-limits.factor");
      if (typeof cfactor === "undefined" || rewards < cfactor)
        session.setSessionData("recurring-limits.factor", rewards);
    }
  }

  private async checkLimit(
    {
      targetAddr,
      remoteIP: _remoteIP,
      userId,
    }: {
      targetAddr?: string;
      remoteIP: string;
      userId: string;
    },
    config: IRecurringLimitConfig,
    action: string
  ): Promise<boolean> {
    const { ip4Subnet, duration, limitCount, limitAmount, message } = config;

    let remoteIP = _remoteIP;

    const noActionOrBlock = !action || action === "block";

    if (ip4Subnet && remoteIP.match(/^[0-9.]+$/)) {
      const ipParts = remoteIP.split(".").slice(0, ip4Subnet / 8);
      if (ipParts.length < 4) {
        ipParts.push("%");
        remoteIP = ipParts.join(".");
      }
    }

    const finishedSessions = await ServiceManager.GetService(
      FaucetDatabase
    ).getFinishedSessions(
      {
        targetAddr,
        remoteIP,
        userId,
      },
      duration,
      true
    );

    let limitApplies = false;
    // Check if user can create a new session based on the limit count
    if (limitCount > 0 && finishedSessions.length >= limitCount) {
      limitApplies = true;
      if (noActionOrBlock) {
        const errMsg =
          message ||
          [
            "You have already created ",
            finishedSessions.length,
            finishedSessions.length > 1 ? " sessions" : " session",
            " in the last ",
            renderTimespan(duration),
          ].join("");
        throw new FaucetError("RECURRING_LIMIT", errMsg);
      }
    }

    // Check limit for amount of tokens/eth requested
    if (limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach(
        (session) => (totalAmount += BigInt(session.dropAmount))
      );

      // Already requested more tokens/eth than the limit allows
      if (totalAmount >= BigInt(limitAmount)) {
        limitApplies = true;
        if (noActionOrBlock) {
          const errMsg =
            message ||
            [
              "You have already requested ",
              ServiceManager.GetService(EthWalletManager).readableAmount(
                totalAmount
              ),
              " in the last ",
              renderTimespan(duration),
            ].join("");
          throw new FaucetError("RECURRING_LIMIT", errMsg);
        }
      }
    }

    return limitApplies;
  }

  public async getTimeToNewSessionStart(
    userId: string,
    remoteIP: string
  ): Promise<number> {
    const limit = this.moduleConfig.limits[0];
    if (!limit) {
      throw new FaucetError("RECURRING_LIMIT", "Limit is not set");
    }

    const limitPromises = await Promise.all(
      this.moduleConfig.limits.map((limit) =>
        this.checkLimit(
          {
            userId,
            remoteIP,
          },
          limit,
          "none"
        )
      )
    );
    const limitApplies = limitPromises.some((res) => res);

    if (!limitApplies) {
      return 0;
    }

    // Check PoW sessions
    const lastSessionStartTime = await ServiceManager.GetService(
      FaucetDatabase
    ).getLastFinishedSessionStartTime(userId, limit.duration);

    // Then check Gitcoin claims
    const lastGitcoinClaimTime = await ServiceManager.GetService(
      FaucetDatabase
    ).getLastGitcoinClaimTime(userId, limit.duration);

    if (!lastGitcoinClaimTime && !lastSessionStartTime) {
      return 0;
    }

    // Get the latest start time
    const lastStartTime = Math.max(lastSessionStartTime, lastGitcoinClaimTime);
    // From seconds to milliseconds
    return lastStartTime * 1000 + limit.duration * 1000;
  }

  private async processSessionRewardFactor(
    session: FaucetSession,
    rewardFactors: ISessionRewardFactor[]
  ) {
    if (
      session
        .getSessionData<string[]>("skip.modules", [])
        .indexOf(this.moduleName) !== -1
    )
      return;
    const rewardPerc = session.getSessionData("recurring-limits.factor", 100);
    if (rewardPerc !== 100) {
      rewardFactors.push({
        factor: rewardPerc / 100,
        module: this.moduleName,
      });
    }
  }
}
