import { ServiceManager } from "../../common/ServiceManager";
import { EthWalletManager } from "../../eth/EthWalletManager";
import { FaucetSession } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { defaultConfig, IGithubRestrictionConfig, IGithubConfig } from './GithubConfig';
import { FaucetError } from '../../common/FaucetError';
import { FaucetDatabase } from "../../db/FaucetDatabase";
import { renderTimespan } from "../../utils/DateUtils";
import { FaucetWebApi, IFaucetApiUrl } from "../../webserv/FaucetWebApi";
import { IncomingMessage } from "http";
import { faucetConfig } from "../../config/FaucetConfig";
import { FaucetHttpResponse } from "../../webserv/FaucetHttpServer";
import { GithubResolver, IGithubInfo, IGithubInfoOpts } from './GithubResolver';
import { GithubDB } from './GithubDB';
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor";

export class GithubModule extends BaseModule<IGithubConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private githubDb: GithubDB;
  private githubResolver: GithubResolver;

  protected override async startModule(): Promise<void> {
    this.githubDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(GithubDB, this);
    this.githubResolver = new GithubResolver(this);
    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "github login config", 
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          clientId: this.moduleConfig.appClientId,
          authTimeout: this.moduleConfig.authTimeout,
          redirectUrl: this.moduleConfig.redirectUrl,
          callbackState: this.moduleConfig.callbackState,
        };
      }
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 6, "Github login check", 
      (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionComplete, 5, "Github save session", 
      (session: FaucetSession) => this.processSessionComplete(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 5, "Github reward factor", 
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint(
      "githubCallback", 
      (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => this.processGithubAuthCallback(req, url, body)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  public getGithubDb(): GithubDB {
    return this.githubDb;
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let infoOpts: IGithubInfoOpts = {
      loadOwnRepo: false,
    };
    this.moduleConfig.checks.forEach((check) => {
      if(check.minOwnRepoCount || check.minOwnRepoStars)
        infoOpts.loadOwnRepo = true;
    });

    let githubInfo: IGithubInfo;
    try{
      githubInfo = await this.githubResolver.getGithubInfo(userInput.githubToken, infoOpts);
    } catch(ex) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error while fetching github info: " + ex.toString());
    }

    let now = Math.floor((new Date()).getTime() / 1000);
    let rewardFactor: number = null;
    for(let i = 0; i < this.moduleConfig.checks.length; i++) {
      let check = this.moduleConfig.checks[i];
      let passed: boolean = null;
      let errmsg: string = null;

      if(!githubInfo && check.required) {
        passed = false;
        errmsg = "missing or invalid github token";
      }
      if((passed || passed === null) && check.minAccountAge) {
        if(!(passed = (now - githubInfo.info.createTime > check.minAccountAge)))
          errmsg = "account age check failed";
      }
      if((passed || passed === null) && check.minRepoCount) {
        if(!(passed = (githubInfo.info.repoCount >= check.minRepoCount)))
          errmsg = "repository count check failed";
      }
      if((passed || passed === null) && check.minFollowers) {
        if(!(passed = (githubInfo.info.followers >= check.minFollowers)))
          errmsg = "follower count check failed";
      }
      if((passed || passed === null) && check.minOwnRepoCount) {
        if(!(passed = (githubInfo.info.ownRepoCount >= check.minOwnRepoCount)))
          errmsg = "own repository count check failed";
      }
      if((passed || passed === null) && check.minOwnRepoStars) {
        if(!(passed = (githubInfo.info.ownRepoStars >= check.minOwnRepoStars)))
          errmsg = "own repository star count check failed";
      }

      if(check.required && passed === false) {
        let errMsg: string;
        if(check.message)
          errMsg = check.message.replace("{0}", errmsg);
        else
          errMsg = "Your github account does not meet the minimum requirements: " + errmsg;
        throw new FaucetError(
          "GITHUB_CHECK", 
          errMsg,
        );
      }
      if(passed !== false && typeof check.rewardFactor === "number" && (rewardFactor === null || check.rewardFactor > rewardFactor)) {
        rewardFactor = check.rewardFactor;
      }
    }

    session.setSessionData("github.uid", githubInfo?.uid);
    session.setSessionData("github.user", githubInfo?.user);
    if(rewardFactor !== null)
      session.setSessionData("github.factor", rewardFactor);

    if(githubInfo) {
      await Promise.all(this.moduleConfig.restrictions.map((restriction) => this.checkRestriction(githubInfo.uid, restriction)));
    }
  }

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    let githubUserId = session.getSessionData("github.uid");
    if(!githubUserId)
      return;

    await this.githubDb.setGithubSession(session.getSessionId(), githubUserId);
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): Promise<void> {
    let githubFactor = session.getSessionData("github.factor");
    if(typeof githubFactor !== "number")
      return;
    rewardFactors.push({
      factor: githubFactor,
      module: this.moduleName,
    });
  }

  private async processGithubAuthCallback(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    let errorCode: string;
    let authCode: string;
    let authResult: any = {};

    if((errorCode = url.query['error'] as string)) {
      authResult['errorCode'] = errorCode;
      authResult['errorMessage'] = url.query['error_description'] as string;
    }
    else if((authCode = url.query['code'] as string)) {
      try {
        authResult['data'] = await this.githubResolver.createAuthInfo(authCode);
      } catch(ex) {
        authResult['errorCode'] = "AUTH_ERROR";
        authResult['errorMessage'] = ex.toString();
      }
    }
    else {
      authResult['errorCode'] = "UNKNOWN";
      authResult['errorMessage'] = "Unknown error in github oauth authentication flow.";
    }
    
    let pageHtml = this.buildCallbackPage(authResult);
    return new FaucetHttpResponse(200, "OK", pageHtml, {
      "Content-Type": "text/html; charset=utf-8",
    });
  }

  private buildCallbackPage(authResult) {
    return [
      '<!DOCTYPE html>',
      '<html>',
        '<head>',
          '<meta charset="UTF-8">',
          '<title>' + faucetConfig.faucetTitle + ': Github Auth</title>',
        '</head>',
        '<body>',
          '<script type="text/javascript">',
            '(function() {',
              'var result = ' + JSON.stringify(authResult) + ';',
              'if(window.opener) {',
                'window.opener.postMessage({',
                  'authModule: "' + this.moduleName + '",',
                  'authResult: result,',
                '});',
              '} else {',
                'localStorage["' + this.moduleName + '.AuthResult"] = JSON.stringify(result);',
                'location.href=location.origin;',
              '}',
            '})();',
          '</script>',
        '</body>',
      '</html>',
    ].join("");
  }

  private async checkRestriction(githubUserId: number, restriction: IGithubRestrictionConfig): Promise<void> {
    let finishedSessions = await this.githubDb.getGithubSessions(githubUserId, restriction.duration, true);

    if(restriction.limitCount > 0 && finishedSessions.length >= restriction.limitCount) {
      let errMsg = restriction.message || [
        "You have already created ",
        finishedSessions.length,
        (finishedSessions.length > 1 ? " sessions" : " session"), 
        " in the last ",
        renderTimespan(restriction.duration)
      ].join("");
      throw new FaucetError(
        "GITHUB_LIMIT", 
        errMsg,
      );
    }

    if(restriction.limitAmount > 0) {
      let totalAmount = 0n;
      finishedSessions.forEach((session) => totalAmount += BigInt(session.dropAmount));
      if(totalAmount >= BigInt(restriction.limitAmount)) {
        let errMsg = restriction.message || [
          "You have already requested ",
          ServiceManager.GetService(EthWalletManager).readableAmount(totalAmount),
          " in the last ",
          renderTimespan(restriction.duration)
        ].join("");
        throw new FaucetError(
          "GITHUB_LIMIT", 
          errMsg,
        );
      }
    }
  }

}
