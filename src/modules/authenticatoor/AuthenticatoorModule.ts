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
import { featureAllowed, serviceAllowed } from './AuthenticatoorServices.js';

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
    this.checkGrantFeatures();

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
      this, ModuleHookAction.SessionAdmit, 2, "authenticatoor limit check",
      (session: FaucetSession) => this.processSessionAdmit(session)
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
    this.checkGrantFeatures();
  }

  private getExpectedService(): string | null {
    let service = this.moduleConfig.expectedService;
    return (typeof service === "string" && service.trim()) ? service : null;
  }

  private checkGrantFeatures(): void {
    if(this.getExpectedService())
      return;
    let features = (this.moduleConfig.grants || []).filter((grant) => !!grant.feature).map((grant) => grant.feature);
    if(features.length > 0) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "authenticatoor module: grants with a feature (" + features.join(", ") + ") never apply because expectedService is not configured");
    }
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
    this.verifier = new AuthenticatoorVerifier(this.moduleConfig.authUrl, audience || "", this.moduleConfig.expectedHost || "");
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;

    let authInfo: IAuthenticatoorAuthInfo | null = null;
    // The token's "services" claim; empty when the token has none (older
    // authenticatoor versions, or one without grants). Such a token has
    // basic access to every service and nothing more: it passes the service
    // check below and holds no feature grant.
    let services = "";
    if(userInput.authToken && this.verifier) {
      try {
        let claims = await this.verifier.verify(userInput.authToken);
        authInfo = this.claimsToAuthInfo(claims);
        services = this.claimsToServices(claims);
      } catch(ex) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error verifying authenticatoor token: " + ex.toString());
        throw new FaucetError("AUTHENTICATOOR_TOKEN", "Invalid authenticatoor login token.");
      }
    }

    let expectedService = this.getExpectedService();
    if(authInfo && expectedService && !serviceAllowed(services, expectedService)) {
      // A login without access to this faucet is no login here: the session
      // goes on without it and gets no grant. It only fails where a login is
      // required.
      if(this.moduleConfig.requireLogin)
        throw new FaucetError("AUTHENTICATOOR_SERVICE", "Your login is not permitted to use this faucet.");
      authInfo = null;
    }

    if(this.moduleConfig.requireLogin && !authInfo) {
      throw new FaucetError("AUTHENTICATOOR_REQUIRED", "You need to authenticate to use this faucet.");
    }

    if(authInfo) {
      // decided here, before the hooks the perks skip; the limits of the
      // applied grants are checked again on admission
      let perks: AuthenticatoorGrantPerks = {};
      let appliedGrants: IAuthenticatoorGrantConfig[] = [];
      for(let i = 0; i < this.moduleConfig.grants.length; i++) {
        let grant = this.moduleConfig.grants[i];
        if(grant.feature && !(expectedService && featureAllowed(services, expectedService, grant.feature, false)))
          continue; // not this login's grant
        if(await this.checkGrant(authInfo, grant, perks))
          appliedGrants.push(grant);
      }

      session.setSessionModuleRef("authenticatoor.grants", appliedGrants);
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

  // Runs one session at a time: the sessions admitted before are visible.
  private async processSessionAdmit(session: FaucetSession): Promise<void> {
    let authInfo = session.getSessionData<IAuthenticatoorAuthInfo>("authenticatoor.data");
    if(!authInfo)
      return;
    this.checkConcurrencyLimit(authInfo, session);
    let appliedGrants = session.getSessionModuleRef("authenticatoor.grants") as IAuthenticatoorGrantConfig[] || [];
    for(let i = 0; i < appliedGrants.length; i++) {
      let limitMessage = await this.getGrantLimitMessage(authInfo, appliedGrants[i]);
      if(limitMessage)
        throw new FaucetError("AUTHENTICATOOR_LIMIT", limitMessage);
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

  private claimsToServices(claims: IAuthenticatoorClaims): string {
    let services = claims.services;
    if(typeof services === "undefined" || services === null)
      return "";
    if(typeof services !== "string")
      throw new Error("token has a malformed services claim");
    return services;
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

  // Applies the grant's perks when it is within its limits; returns whether it
  // did. A required grant over its limits fails the session.
  private async checkGrant(authInfo: IAuthenticatoorAuthInfo, grant: IAuthenticatoorGrantConfig, perks: AuthenticatoorGrantPerks): Promise<boolean> {
    let limitMessage = await this.getGrantLimitMessage(authInfo, grant);
    if(limitMessage) {
      if(!grant.required)
        return false;
      throw new FaucetError("AUTHENTICATOOR_LIMIT", limitMessage);
    }

    if(grant.skipModules)
      perks.skipModules = grant.skipModules;
    if(typeof grant.rewardFactor === "number")
      perks.factor = grant.rewardFactor;
    if(typeof grant.overrideMaxDrop !== "undefined")
      perks.overrideMaxDrop = grant.overrideMaxDrop;
    return true;
  }

  private async getGrantLimitMessage(authInfo: IAuthenticatoorAuthInfo, grant: IAuthenticatoorGrantConfig): Promise<string | null> {
    if(!(grant.limitCount > 0) && !(grant.limitAmount > 0))
      return null;
    let finishedSessions = await this.authDb.getUserSessions(authInfo.userId, grant.duration, true);

    if(grant.limitCount > 0 && finishedSessions.length >= grant.limitCount) {
      return grant.message || [
        "You have already created ",
        finishedSessions.length,
        (finishedSessions.length > 1 ? " sessions" : " session"),
        " in the last ",
        renderTimespan(grant.duration),
      ].join("");
    }

    if(grant.limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach((sess) => totalAmount += BigInt(sess.dropAmount));
      if(totalAmount >= BigInt(grant.limitAmount)) {
        return grant.message || [
          "You have already requested ",
          ServiceManager.GetService(EthWalletManager).readableAmount(totalAmount),
          " in the last ",
          renderTimespan(grant.duration),
        ].join("");
      }
    }
    return null;
  }

}
