import { IncomingMessage } from "http";
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
import { FaucetWebApi, IFaucetApiUrl } from "../../webserv/FaucetWebApi.js";
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

// A selectable grant as the grant list endpoint reports it to a login.
export interface IAuthenticatoorGrantInfo {
  id: string;
  name: string;
  description: string | null;
  rewardFactor: number | null;
  dropAmount: string | null;
  noMining: boolean;
  limitCount: number;
  limitAmount: string;
  duration: number;
  usedCount: number;
  usedAmount: string;
  available: boolean;
  // unix time the grant can be used again; null while it is available
  nextAvailable: number | null;
}

interface IAuthenticatoorLogin {
  authInfo: IAuthenticatoorAuthInfo;
  // the token's "services" claim, "" when it has none
  services: string;
}

interface IGrantUsage {
  sessions: { start: number, amount: bigint }[];
  count: number;
  amount: bigint;
}

const GRANT_ID_PATTERN = /^[A-Za-z0-9_.-]{1,64}$/;

export class AuthenticatoorModule extends BaseModule<IAuthenticatoorConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private authDb: AuthenticatoorDB;
  private verifier: AuthenticatoorVerifier;
  private validGrants = new Set<IAuthenticatoorGrantConfig>();

  protected override async startModule(): Promise<void> {
    this.authDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(AuthenticatoorDB, this);
    this.initVerifier();
    this.checkGrants();

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
          grantSelection: this.getGrants().some((grant) => grant.selectable),
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
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint(
      "authenticatoorGrants",
      (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => this.processGrantsRequest(req)
    );
  }

  protected override stopModule(): Promise<void> {
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("authenticatoorGrants");
    this.verifier = null;
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    this.initVerifier();
    this.checkGrants();
  }

  private getExpectedService(): string | null {
    let service = this.moduleConfig.expectedService;
    return (typeof service === "string" && service.trim()) ? service : null;
  }

  // Validates the grant list. A grant that cannot work as configured is
  // skipped (with a warning) rather than applied half-way.
  private checkGrants(): void {
    let logWarning = (msg: string) => ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "authenticatoor module: " + msg);
    let grants = this.moduleConfig.grants || [];
    let validGrants = new Set<IAuthenticatoorGrantConfig>();
    let ids = new Set<string>();
    grants.forEach((grant, idx) => {
      let label = "grant #" + (idx + 1) + (grant.id ? " (" + grant.id + ")" : "");
      if(typeof grant.id !== "undefined" && grant.id !== null) {
        if(typeof grant.id !== "string" || !GRANT_ID_PATTERN.test(grant.id))
          return logWarning(label + " is skipped: its id must be 1-64 characters of A-Z, a-z, 0-9, '_', '.' or '-'");
        if(ids.has(grant.id))
          return logWarning(label + " is skipped: another grant has the same id");
        ids.add(grant.id);
      }
      if(grant.selectable && !grant.id)
        return logWarning(label + " is skipped: a selectable grant needs an id");
      validGrants.add(grant);
    });
    this.validGrants = validGrants;

    if(!this.getExpectedService()) {
      let features = this.getGrants().filter((grant) => !!grant.feature).map((grant) => grant.feature);
      if(features.length > 0)
        logWarning("grants with a feature (" + features.join(", ") + ") never apply because expectedService is not configured");
    }
  }

  private getGrants(): IAuthenticatoorGrantConfig[] {
    return (this.moduleConfig.grants || []).filter((grant) => this.validGrants.has(grant));
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

  // Verifies a login token. Throws AUTHENTICATOOR_TOKEN for a token that
  // does not verify. Returns null for a login without access to this faucet
  // (its services claim does not allow expectedService).
  private async verifyLogin(token: string): Promise<IAuthenticatoorLogin | null> {
    let login: IAuthenticatoorLogin;
    try {
      if(!this.verifier)
        throw new Error("no authUrl configured");
      let claims = await this.verifier.verify(token);
      // The token's "services" claim; empty when the token has none (older
      // authenticatoor versions, or one without grants). Such a token has
      // basic access to every service and nothing more: it passes the
      // service check below and holds no feature grant.
      login = {
        authInfo: this.claimsToAuthInfo(claims),
        services: this.claimsToServices(claims),
      };
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error verifying authenticatoor token: " + ex.toString());
      throw new FaucetError("AUTHENTICATOOR_TOKEN", "Invalid authenticatoor login token.");
    }

    let expectedService = this.getExpectedService();
    if(expectedService && !serviceAllowed(login.services, expectedService))
      return null;
    return login;
  }

  // A grant with a feature applies only to logins that hold the feature.
  private loginHoldsGrant(login: IAuthenticatoorLogin, grant: IAuthenticatoorGrantConfig): boolean {
    if(!grant.feature)
      return true;
    let expectedService = this.getExpectedService();
    return !!expectedService && featureAllowed(login.services, expectedService, grant.feature, false);
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;

    let login: IAuthenticatoorLogin | null = null;
    if(userInput.authToken && this.verifier) {
      login = await this.verifyLogin(userInput.authToken);
      if(!login && this.moduleConfig.requireLogin) {
        // A login without access to this faucet is no login here: the
        // session goes on without it and gets no grant. It only fails where
        // a login is required.
        throw new FaucetError("AUTHENTICATOOR_SERVICE", "Your login is not permitted to use this faucet.");
      }
    }

    if(this.moduleConfig.requireLogin && !login) {
      throw new FaucetError("AUTHENTICATOOR_REQUIRED", "You need to authenticate to use this faucet.");
    }

    let selectedGrantId = userInput.authGrant;
    let hasSelection = typeof selectedGrantId !== "undefined" && selectedGrantId !== null && selectedGrantId !== "";
    if(hasSelection && (!login || typeof selectedGrantId !== "string"))
      throw new FaucetError("AUTHENTICATOOR_GRANT", "The selected grant is not available without a valid login.");

    if(!login)
      return;

    let authInfo = login.authInfo;
    this.checkConcurrencyLimit(authInfo, session);
    session.setSessionData("authenticatoor.data", authInfo);

    let perks: AuthenticatoorGrantPerks = {};
    let grants = this.getGrants();
    for(let i = 0; i < grants.length; i++) {
      let grant = grants[i];
      if(grant.selectable || !this.loginHoldsGrant(login, grant))
        continue;
      if(await this.checkGrant(authInfo, grant, !!grant.required))
        this.applyGrantPerks(grant, perks, false);
    }

    if(hasSelection) {
      let grant = grants.find((grant) => grant.selectable && grant.id === selectedGrantId);
      if(!grant || !this.loginHoldsGrant(login, grant))
        throw new FaucetError("AUTHENTICATOOR_GRANT", "The selected grant is not available for your login.");
      await this.checkGrant(authInfo, grant, true);
      this.applyGrantPerks(grant, perks, true);
      session.setSessionData("authenticatoor.grant", grant.id);
      // the grant is taken from here on: running sessions count against it
      await this.authDb.setUserSession(session.getSessionId(), authInfo.userId, authInfo.issuer, grant.id);
    }
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

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    let authInfo = session.getSessionData<IAuthenticatoorAuthInfo>("authenticatoor.data");
    if(!authInfo)
      return;
    await this.authDb.setUserSession(session.getSessionId(), authInfo.userId, authInfo.issuer, session.getSessionData<string>("authenticatoor.grant") || null);
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

  private async processGrantsRequest(req: IncomingMessage): Promise<any> {
    let header = req.headers?.authorization;
    let match = typeof header === "string" ? /^Bearer\s+(\S+)$/i.exec(header.trim()) : null;
    if(!match)
      return { errorCode: "AUTHENTICATOOR_TOKEN", errorMessage: "Missing authenticatoor login token." };

    let login: IAuthenticatoorLogin | null;
    try {
      login = await this.verifyLogin(match[1]);
    } catch(ex) {
      if(ex instanceof FaucetError)
        return { errorCode: ex.getCode(), errorMessage: ex.message };
      throw ex;
    }
    if(!login)
      return { errorCode: "AUTHENTICATOOR_SERVICE", errorMessage: "Your login is not permitted to use this faucet." };

    let grants = this.getGrants().filter((grant) => grant.selectable && this.loginHoldsGrant(login, grant));
    let grantInfos = await Promise.all(grants.map(async (grant) => {
      let usage = await this.getGrantUsage(login.authInfo, grant);
      return this.getGrantInfo(grant, usage);
    }));
    return { grants: grantInfos };
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

  // Checks a grant's limits for the login. Returns false for a grant over
  // its limits, or throws AUTHENTICATOOR_LIMIT when throwOnLimit is set.
  private async checkGrant(authInfo: IAuthenticatoorAuthInfo, grant: IAuthenticatoorGrantConfig, throwOnLimit: boolean): Promise<boolean> {
    let usage = await this.getGrantUsage(authInfo, grant);
    let limitMessage = this.getLimitMessage(grant, usage);
    if(limitMessage) {
      if(throwOnLimit)
        throw new FaucetError("AUTHENTICATOOR_LIMIT", limitMessage);
      return false;
    }
    return true;
  }

  // The sessions that count against a grant: for a normal grant the user's
  // claimable and completed sessions, for a selectable grant the user's
  // sessions that selected it and are running, claimable or completed.
  private async getGrantUsage(authInfo: IAuthenticatoorAuthInfo, grant: IAuthenticatoorGrantConfig): Promise<IGrantUsage> {
    let sessions = grant.selectable
      ? await this.authDb.getUserGrantSessions(authInfo.userId, grant.id, grant.duration, true)
      : await this.authDb.getUserSessions(authInfo.userId, grant.duration, true);
    let usage: IGrantUsage = { sessions: [], count: 0, amount: 0n };
    sessions.forEach((sess) => {
      // a running session has no amount yet
      let amount = BigInt(sess.dropAmount);
      if(amount < 0n)
        amount = 0n;
      usage.sessions.push({ start: sess.startTime, amount: amount });
      usage.count++;
      usage.amount += amount;
    });
    return usage;
  }

  private getLimitMessage(grant: IAuthenticatoorGrantConfig, usage: IGrantUsage): string | null {
    if(grant.limitCount > 0 && usage.count >= grant.limitCount) {
      return grant.message || [
        "You have already created ",
        usage.count,
        (usage.count > 1 ? " sessions" : " session"),
        " in the last ",
        renderTimespan(grant.duration),
      ].join("");
    }
    if(grant.limitAmount > 0 && usage.amount >= BigInt(grant.limitAmount)) {
      return grant.message || [
        "You have already requested ",
        ServiceManager.GetService(EthWalletManager).readableAmount(usage.amount),
        " in the last ",
        renderTimespan(grant.duration),
      ].join("");
    }
    return null;
  }

  // When a grant over its limits can be used again: once enough of the
  // counted sessions have left the time window.
  private getNextAvailable(grant: IAuthenticatoorGrantConfig, usage: IGrantUsage): number | null {
    let sessions = usage.sessions.slice().sort((a, b) => a.start - b.start);
    let time = 0;
    if(grant.limitCount > 0 && usage.count >= grant.limitCount) {
      time = Math.max(time, sessions[usage.count - grant.limitCount].start + grant.duration);
    }
    if(grant.limitAmount > 0 && usage.amount >= BigInt(grant.limitAmount)) {
      let remaining = usage.amount;
      for(let i = 0; i < sessions.length; i++) {
        remaining -= sessions[i].amount;
        if(remaining < BigInt(grant.limitAmount)) {
          time = Math.max(time, sessions[i].start + grant.duration);
          break;
        }
      }
    }
    return time || null;
  }

  private getGrantInfo(grant: IAuthenticatoorGrantConfig, usage: IGrantUsage): IAuthenticatoorGrantInfo {
    let available = !this.getLimitMessage(grant, usage);
    return {
      id: grant.id,
      name: grant.name || grant.id,
      description: grant.description || null,
      rewardFactor: typeof grant.rewardFactor === "number" ? grant.rewardFactor : null,
      dropAmount: typeof grant.overrideMaxDrop === "number" ? BigInt(grant.overrideMaxDrop).toString() : null,
      noMining: !!grant.skipModules && grant.skipModules.indexOf("pow") !== -1,
      limitCount: grant.limitCount || 0,
      limitAmount: BigInt(grant.limitAmount || 0).toString(),
      duration: grant.duration,
      usedCount: usage.count,
      usedAmount: usage.amount.toString(),
      available: available,
      nextAvailable: available ? null : this.getNextAvailable(grant, usage),
    };
  }

  // Merges a grant's perks into the session's: what the grant sets replaces
  // what an earlier grant set. The selected grant comes last. When it pays a
  // fixed drop without a reward factor of its own, the factor of the other
  // grants does not apply to it.
  private applyGrantPerks(grant: IAuthenticatoorGrantConfig, perks: AuthenticatoorGrantPerks, selected: boolean): void {
    if(grant.skipModules)
      perks.skipModules = grant.skipModules;
    if(typeof grant.rewardFactor === "number")
      perks.factor = grant.rewardFactor;
    else if(selected && typeof grant.overrideMaxDrop === "number")
      delete perks.factor;
    if(typeof grant.overrideMaxDrop !== "undefined")
      perks.overrideMaxDrop = grant.overrideMaxDrop;
  }

}
