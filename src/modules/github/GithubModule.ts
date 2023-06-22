import { ServiceManager } from "../../common/ServiceManager";
import { EthWalletManager } from "../../eth/EthWalletManager";
import { FaucetSession, FaucetSessionStoreData } from "../../session/FaucetSession";
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
import { GithubResolver, IGithubAuthInfo } from './GithubResolver';

export class GithubModule extends BaseModule<IGithubConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private githubResolver: GithubResolver;

  protected override startModule(): Promise<void> {
    this.githubResolver = new GithubResolver(this);
    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "github login config", 
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          clientId: this.moduleConfig.appClientId,
          authTimeout: this.moduleConfig.authTimeout,
        };
      }
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 6, "Github login check", 
      (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
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

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    await Promise.all(this.moduleConfig.restrictions.map((limit) => this.checkLimit(session, limit)));
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

  private async checkLimit(session: FaucetSession, limit: IGithubRestrictionConfig): Promise<void> {
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
