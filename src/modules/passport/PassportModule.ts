
import { ServiceManager } from '../../common/ServiceManager.js';
import { BaseModule } from '../BaseModule.js';
import { defaultConfig, IPassportConfig } from './PassportConfig.js';
import { ModuleHookAction } from '../ModuleManager.js';
import { FaucetSession, FaucetSessionStatus } from '../../session/FaucetSession.js';
import { ISessionRewardFactor } from '../../session/SessionRewardFactor.js';
import { FaucetWebApi, IFaucetApiUrl } from '../../webserv/FaucetWebApi.js';
import { IPassportInfo, PassportResolver } from './PassportResolver.js';
import { IncomingMessage } from 'http';
import { SessionManager } from '../../session/SessionManager.js';
import { PassportDB } from './PassportDB.js';
import { FaucetDatabase } from '../../db/FaucetDatabase.js';
import { FaucetError } from '../../common/FaucetError.js';

export class PassportModule extends BaseModule<IPassportConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  
  private passportDb: PassportDB;
  private passportResolver: PassportResolver;

  protected override async startModule(): Promise<void> {
    this.passportDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(PassportDB, this);
    this.passportResolver = new PassportResolver(this);
    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "passport config", 
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          refreshTimeout: this.moduleConfig.refreshCooldown,
          manualVerification: (this.moduleConfig.trustedIssuers && this.moduleConfig.trustedIssuers.length > 0),
          stampScoring: this.moduleConfig.stampScoring,
          boostFactor: this.moduleConfig.boostFactor,
          overrideScores: [ this.moduleConfig.skipHostingCheckScore, this.moduleConfig.skipProxyCheckScore, this.moduleConfig.requireMinScore ],
          guestRefresh: this.moduleConfig.allowGuestRefresh ? (this.moduleConfig.guestRefreshCooldown > 0 ? this.moduleConfig.guestRefreshCooldown : this.moduleConfig.refreshCooldown) : false,
        };
      }
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 6, "passport",
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionInfo, 1, "passport state", 
      async (session: FaucetSession, moduleState: any) => this.processSessionInfo(session, moduleState)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 5, "passport boost",
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint(
      "refreshPassport", 
      (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => this.processPassportRefresh(req, url, body)
    );
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint(
      "getPassportInfo", 
      (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => this.processGetPassportInfo(req, url, body)
    );
  }

  protected override async stopModule(): Promise<void> {
    this.passportDb.dispose();
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("refreshPassport");
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("getPassportInfo");
  }

  public getPassportDb(): PassportDB {
    return this.passportDb;
  }

  protected override onConfigReload(): void {
    this.passportResolver.increaseScoreNonce(); // refresh cached scores on config reload
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let targetAddr = session.getTargetAddr();
    let passportInfo = await this.passportResolver.getPassport(targetAddr);
    session.setSessionData("passport.refresh", Math.floor(new Date().getTime() / 1000));
    session.setSessionData("passport.data", passportInfo);
    let score = this.passportResolver.getPassportScore(passportInfo);
    session.setSessionData("passport.score", score);

    if(this.moduleConfig.skipHostingCheckScore > 0 && score.score >= this.moduleConfig.skipHostingCheckScore) {
      session.setSessionData("ipinfo.override_hosting", false);
    }
    if(this.moduleConfig.skipProxyCheckScore > 0 && score.score >= this.moduleConfig.skipProxyCheckScore) {
      session.setSessionData("ipinfo.override_proxy", false);
    }
    if(this.moduleConfig.requireMinScore > 0 && score.score < this.moduleConfig.requireMinScore) {
      let err = new FaucetError("PASSPORT_SCORE", "You need a passport score of at least " + this.moduleConfig.requireMinScore + " to use this faucet.");
      err.data = { 
        "address": session.getTargetAddr(),
      };
      throw err;
    }
  }

  private async processSessionInfo(session: FaucetSession, moduleState: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    if(session.getSessionStatus() !== FaucetSessionStatus.RUNNING)
      return;
    let passportInfo: IPassportInfo = session.getSessionData("passport.data");
    let passportBoost = passportInfo ?  this.passportResolver.getPassportScore(passportInfo) : null;
    moduleState[this.moduleName] = passportBoost;
  }

  private processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): void {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let passportInfo: IPassportInfo = session.getSessionData("passport.data");
    if(!passportInfo)
      return;
    let passportBoost = this.passportResolver.getPassportScore(passportInfo);
    session.setSessionData("passport.score", passportBoost);
    if(passportBoost.factor !== 1) {
      rewardFactors.push({
        factor: passportBoost.factor,
        module: this.moduleName,
      });
    }
  }

  private async processPassportRefresh(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    let sessionId = url.query['session'] as string;
    let session: FaucetSession;
    let address: string;
    let refreshCooldown: number;
    
    if(sessionId) {
      if(!(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
        return {
          code: "INVALID_SESSION",
          error: "Session not found"
        };
      }

      address = session.getTargetAddr();
      refreshCooldown = this.moduleConfig.refreshCooldown;
    } else {
      if (!this.moduleConfig.allowGuestRefresh) {
        return {
          code: "NOT_ALLOWED",
          error: "Passport refresh not allowed without active session"
        };
      }

      address = url.query['address'] as string;
      if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/) || address.match(/^0x0{40}$/i)) {
        return {
          code: "INVALID_ADDRESS",
          error: "Invalid address"
        };
      }

      refreshCooldown = this.moduleConfig.guestRefreshCooldown > 0 ? this.moduleConfig.guestRefreshCooldown : this.moduleConfig.refreshCooldown;
    }

    let now = Math.floor(new Date().getTime() / 1000);
    let passportInfo: IPassportInfo;
    if(req.method === "POST") {
      // manual refresh
      let verifyResult = await this.passportResolver.verifyUserPassport(address, JSON.parse(body.toString("utf8")));
      if(!verifyResult.valid) {
        return {
          code: "PASSPORT_VALIDATION",
          error: "Passport verification failed",
          errors: verifyResult.errors,
        };
      }
      passportInfo = verifyResult.passportInfo;
    }
    else {
      // auto refresh
      let lastRefresh: number;
      if(session) {
        lastRefresh = session.getSessionData("passport.refresh") || 0;
      } else {
        let cachedPassport = await this.passportResolver.getCachedPassport(address);
        lastRefresh = cachedPassport ? cachedPassport.parsed : 0;
      }

      if(now - lastRefresh < refreshCooldown) {
        return {
          code: "REFRESH_COOLDOWN",
          error: "Passport has been refreshed recently. Please wait " + (lastRefresh + refreshCooldown - now) + " sec",
          cooldown: lastRefresh + refreshCooldown,
        };
      }

      passportInfo = await this.passportResolver.getPassport(address, true);
    }

    let passportScore = this.passportResolver.getPassportScore(passportInfo);
    if(session) {
      session.setSessionData("passport.refresh", now);
      session.setSessionData("passport.data", passportInfo);
      session.setSessionData("passport.score", passportScore);
    }

    return {
      passport: passportInfo,
      score: passportScore,
      cooldown: now + refreshCooldown,
    };
  }

  private async processGetPassportInfo(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    let sessionId = url.query['session'] as string;
    let passportInfo: IPassportInfo

    if(sessionId) {
      let session: FaucetSession;
      if(!(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
        return {
          code: "INVALID_SESSION",
          error: "Session not found"
        };
      }

      passportInfo = session.getSessionData("passport.data");
      if(!passportInfo) {
        return {
          code: "INVALID_PASSPORT",
          error: "Passport not found"
        };
      }
    }
    else if(!sessionId) {
      if (!this.moduleConfig.allowGuestRefresh) {
        return {
          code: "NOT_ALLOWED",
          error: "Passport info not allowed without active session"
        };
      }

      let address = url.query['address'] as string;
      if (!address || !address.match(/^0x[0-9a-fA-F]{40}$/) || address.match(/^0x0{40}$/i)) {
        return {
          code: "INVALID_ADDRESS",
          error: "Invalid address"
        };
      }

      passportInfo = await this.passportResolver.getCachedPassport(address);
    }
    
    return {
      passport: passportInfo,
      score: this.passportResolver.getPassportScore(passportInfo),
    }
  }

}
