
import { ServiceManager } from '../../common/ServiceManager';
import { BaseModule } from '../BaseModule';
import { defaultConfig, IPassportConfig } from './PassportConfig';
import { ModuleHookAction } from '../ModuleManager';
import { FaucetSession, FaucetSessionStatus } from '../../session/FaucetSession';
import { ISessionRewardFactor } from '../../session/SessionRewardFactor';
import { FaucetWebApi, IFaucetApiUrl } from '../../webserv/FaucetWebApi';
import { IPassportInfo, PassportResolver } from './PassportResolver';
import { IncomingMessage } from 'http';
import { SessionManager } from '../../session/SessionManager';
import { PassportDB } from './PassportDB';
import { FaucetDatabase } from '../../db/FaucetDatabase';

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
    session.setSessionData("passport.score", this.passportResolver.getPassportScore(passportInfo));
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
    if(!sessionId || !(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
      return {
        code: "INVALID_SESSION",
        error: "Session not found"
      };
    }

    let now = Math.floor(new Date().getTime() / 1000);
    let passportInfo: IPassportInfo;
    if(req.method === "POST") {
      // manual refresh
      let verifyResult = await this.passportResolver.verifyUserPassport(session.getTargetAddr(), JSON.parse(body.toString("utf8")));
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
      let lastRefresh = session.getSessionData("passport.refresh") || 0;
      if(now - lastRefresh < this.moduleConfig.refreshCooldown) {
        return {
          code: "REFRESH_COOLDOWN",
          error: "Passport has been refreshed recently. Please wait " + (lastRefresh + this.moduleConfig.refreshCooldown - now) + " sec",
          cooldown: lastRefresh + this.moduleConfig.refreshCooldown,
        };
      }

      passportInfo = await this.passportResolver.getPassport(session.getTargetAddr(), true);
    }

    let passportScore = this.passportResolver.getPassportScore(passportInfo);
    session.setSessionData("passport.refresh", now);
    session.setSessionData("passport.data", passportInfo);
    session.setSessionData("passport.score", passportScore);

    return {
      passport: passportInfo,
      score: passportScore,
      cooldown: now + this.moduleConfig.refreshCooldown,
    };
  }

  private async processGetPassportInfo(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    let sessionId = url.query['session'] as string;
    let session: FaucetSession;
    if(!sessionId || !(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
      return {
        code: "INVALID_SESSION",
        error: "Session not found"
      };
    }
    
    let passportInfo: IPassportInfo = session.getSessionData("passport.data");
    if(!passportInfo) {
      return {
        code: "INVALID_PASSPORT",
        error: "Passport not found"
      };
    }
    
    return {
      passport: passportInfo,
      score: this.passportResolver.getPassportScore(passportInfo),
    }
  }

}
