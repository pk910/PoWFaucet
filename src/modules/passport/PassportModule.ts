
import { ServiceManager } from '../../common/ServiceManager';
import { BaseModule } from '../BaseModule';
import { IPassportConfig } from './PassportConfig';
import { ModuleHookAction } from '../ModuleManager';
import { FaucetSession, FaucetSessionStatus } from '../../session/FaucetSession';
import { ISessionRewardFactor } from '../../session/SessionRewardFactor';
import { FaucetWebApi, IFaucetApiUrl } from '../../webserv/FaucetWebApi';
import { IPassportInfo, PassportResolver } from './PassportResolver';
import { IncomingMessage } from 'http';
import { SessionManager } from '../../session/SessionManager';
import { FaucetHttpResponse } from '../../webserv/FaucetHttpServer';

export class PassportModule extends BaseModule<IPassportConfig> {
  private passportResolver: PassportResolver;

  protected override startModule(): void {
    this.passportResolver = new PassportResolver(this);
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 6, "passport",
      (session: FaucetSession) => this.processSessionStart(session)
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

  protected override stopModule(): void {
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("refreshPassport");
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("getPassportInfo");
  }

  protected override onConfigReload(): void {
    this.passportResolver.increaseScoreNonce(); // refresh cached scores on config reload
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    let targetAddr = session.getTargetAddr();
    let passportInfo = await this.passportResolver.getPassport(targetAddr);
    session.setSessionData("passport.data", passportInfo);
    session.setSessionModuleRef("passport.score", this.passportResolver.getPassportScore(passportInfo));
  }

  private processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): void {
    let passportInfo: IPassportInfo = session.getSessionData("passport.data");
    if(!passportInfo)
      return;
    let passportBoost = this.passportResolver.getPassportScore(passportInfo);
    session.setSessionModuleRef("passport.score", passportBoost);
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
    if(!sessionId || !(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING])))
      return new FaucetHttpResponse(404, "Session not found");
    
    // TODO
  }

  private async processGetPassportInfo(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    let sessionId = url.query['session'] as string;
    let session: FaucetSession;
    if(!sessionId || !(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING])))
      return new FaucetHttpResponse(404, "Session not found");
    
    let passportInfo: IPassportInfo = session.getSessionData("passport.data");
    if(!passportInfo)
      return new FaucetHttpResponse(404, "Passport not found");
    
    return {
      passport: passportInfo,
      score: this.passportResolver.getPassportScore(passportInfo),
    }
  }

}
