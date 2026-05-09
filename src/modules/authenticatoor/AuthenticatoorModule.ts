import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IAuthenticatoorConfig, IAuthenticatoorGrantConfig } from './AuthenticatoorConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { renderTimespan } from "../../utils/DateUtils.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor.js";
import { SessionManager } from "../../session/SessionManager.js";
import { AuthenticatoorVerifier, IAuthenticatoorClaims } from './AuthenticatoorVerifier.js';
import { AuthenticatoorDB } from './AuthenticatoorDB.js';

export interface IAuthenticatoorAuthInfo {
  userId: string;
  email: string;
  issuer: string;
}

export interface AuthenticatoorGrantPerks {
  factor?: number;
  skipModules?: string[];
  overrideMaxDrop?: number;
}

export class AuthenticatoorModule extends BaseModule<IAuthenticatoorConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private authDb: AuthenticatoorDB;
  private verifier: AuthenticatoorVerifier;

  protected override async startModule(): Promise<void> {
    this.authDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(AuthenticatoorDB, this);
    this.initVerifier();

    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "authenticatoor login config",
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          authUrl: this.moduleConfig.authUrl,
          requireLogin: this.moduleConfig.requireLogin,
          loginLabel: this.moduleConfig.loginLabel,
          userLabel: this.moduleConfig.userLabel,
          infoHtml: this.moduleConfig.infoHtml,
          loginLogo: this.moduleConfig.loginLogo,
        };
      }
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 2, "authenticatoor login check",
      (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionComplete, 5, "authenticatoor save session",
      (session: FaucetSession) => this.processSessionComplete(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 5, "authenticatoor reward factor",
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
  }

  protected override stopModule(): Promise<void> {
    this.verifier = null;
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.initVerifier();
  }

  private initVerifier(): void {
    if(!this.moduleConfig.authUrl) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "authenticatoor module enabled but no authUrl configured; tokens cannot be verified");
      this.verifier = null;
      return;
    }
    let audience = this.moduleConfig.expectedAudience;
    if(!audience) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "authenticatoor module: expectedAudience is not configured; verification will fail until set");
    }
    this.verifier = new AuthenticatoorVerifier(this.moduleConfig.authUrl, audience || "");
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;

    let authInfo: IAuthenticatoorAuthInfo | null = null;
    if(userInput.authToken && this.verifier) {
      try {
        let claims = await this.verifier.verify(userInput.authToken);
        authInfo = this.claimsToAuthInfo(claims);
      } catch(ex) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error verifying authenticatoor token: " + ex.toString());
        throw new FaucetError("AUTHENTICATOOR_TOKEN", "Invalid authenticatoor login token.");
      }
    }

    if(this.moduleConfig.requireLogin && !authInfo) {
      throw new FaucetError("AUTHENTICATOOR_REQUIRED", "You need to authenticate to use this faucet.");
    }

    if(authInfo) {
      this.checkConcurrencyLimit(authInfo, session);

      let perks: AuthenticatoorGrantPerks = {};
      for(let i = 0; i < this.moduleConfig.grants.length; i++) {
        await this.checkGrant(authInfo, this.moduleConfig.grants[i], perks);
      }

      session.setSessionData("authenticatoor.data", authInfo);
      if(typeof perks.factor === "number")
        session.setSessionData("authenticatoor.factor", perks.factor);
      if(typeof perks.overrideMaxDrop === "number") {
        session.setSessionData("overrideMaxDropAmount", perks.overrideMaxDrop.toString());
        session.setDropAmount(BigInt(perks.overrideMaxDrop));
      }
      if(perks.skipModules) {
        let skipModules = session.getSessionData<Array<string>>("skip.modules", []);
        perks.skipModules.forEach((mod) => {
          if(!mod)
            return;
          if(skipModules.indexOf(mod) === -1)
            skipModules.push(mod);
        });
        session.setSessionData("skip.modules", skipModules);
      }
    }
  }

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    let authInfo = session.getSessionData<IAuthenticatoorAuthInfo>("authenticatoor.data");
    if(!authInfo)
      return;
    await this.authDb.setUserSession(session.getSessionId(), authInfo.userId, authInfo.issuer);
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): Promise<void> {
    let factor = session.getSessionData("authenticatoor.factor");
    if(typeof factor !== "number")
      return;
    rewardFactors.push({
      factor: factor,
      module: this.moduleName,
    });
  }

  private claimsToAuthInfo(claims: IAuthenticatoorClaims): IAuthenticatoorAuthInfo {
    let userId = claims.email || (claims.sub as string) || "";
    if(!userId)
      throw new Error("token has no email or sub claim");
    return {
      userId: userId,
      email: claims.email || "",
      issuer: (claims.iss as string) || "",
    };
  }

  private checkConcurrencyLimit(authInfo: IAuthenticatoorAuthInfo, session: FaucetSession): void {
    if(this.moduleConfig.concurrencyLimit === 0)
      return;
    let activeSessions = ServiceManager.GetService(SessionManager).getActiveSessions();
    let concurrent = activeSessions.filter((sess) => {
      if(sess === session)
        return false;
      let info = sess.getSessionData<IAuthenticatoorAuthInfo>("authenticatoor.data");
      return info && info.userId === authInfo.userId;
    }).length;
    if(concurrent >= this.moduleConfig.concurrencyLimit) {
      throw new FaucetError(
        "AUTHENTICATOOR_CONCURRENCY_LIMIT",
        "Only " + this.moduleConfig.concurrencyLimit + " concurrent sessions allowed per authenticated user.",
      );
    }
  }

  private async checkGrant(authInfo: IAuthenticatoorAuthInfo, grant: IAuthenticatoorGrantConfig, perks: AuthenticatoorGrantPerks): Promise<void> {
    let finishedSessions = await this.authDb.getUserSessions(authInfo.userId, grant.duration, true);

    if(grant.limitCount > 0 && finishedSessions.length >= grant.limitCount) {
      if(!grant.required)
        return;
      let errMsg = grant.message || [
        "You have already created ",
        finishedSessions.length,
        (finishedSessions.length > 1 ? " sessions" : " session"),
        " in the last ",
        renderTimespan(grant.duration),
      ].join("");
      throw new FaucetError("AUTHENTICATOOR_LIMIT", errMsg);
    }

    if(grant.limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach((sess) => totalAmount += BigInt(sess.dropAmount));
      if(totalAmount >= BigInt(grant.limitAmount)) {
        if(!grant.required)
          return;
        let errMsg = grant.message || [
          "You have already requested ",
          ServiceManager.GetService(EthWalletManager).readableAmount(totalAmount),
          " in the last ",
          renderTimespan(grant.duration),
        ].join("");
        throw new FaucetError("AUTHENTICATOOR_LIMIT", errMsg);
      }
    }

    if(grant.skipModules)
      perks.skipModules = grant.skipModules;
    if(typeof grant.rewardFactor === "number")
      perks.factor = grant.rewardFactor;
    if(typeof grant.overrideMaxDrop !== "undefined")
      perks.overrideMaxDrop = grant.overrideMaxDrop;
  }

}
