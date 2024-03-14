import { ServiceManager } from "../../common/ServiceManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { FaucetSession } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IZupassConfig, IZupassGrantConfig } from './ZupassConfig.js';
import { FaucetError } from '../../common/FaucetError.js';
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { renderTimespan } from "../../utils/DateUtils.js";
import { FaucetWebApi, IFaucetApiUrl } from "../../webserv/FaucetWebApi.js";
import { IncomingMessage } from "http";
import { faucetConfig } from "../../config/FaucetConfig.js";
import { FaucetHttpResponse } from "../../webserv/FaucetHttpServer.js";
import { IZupassPDCData, ZupassPCD } from './ZupassPCD.js';
import { ZupassDB } from './ZupassDB.js';
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor.js";
import { SessionManager } from "../../session/SessionManager.js";
import { generateSnarkMessageHash } from "./ZupassUtils.js";

export interface ZupassGrantPerks {
  factor?: number;
  skipModules?: string[];
  overrideMaxDrop?: number;
}

export class ZupassModule extends BaseModule<IZupassConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private zupassDb: ZupassDB;
  private zupassPCD: ZupassPCD;
  private pcdWatermark: string;
  private pcdNullifier: string;

  protected override async startModule(): Promise<void> {
    this.zupassDb = await ServiceManager.GetService(FaucetDatabase).createModuleDb(ZupassDB, this);
    this.zupassPCD = new ZupassPCD(this);

    this.pcdWatermark = generateSnarkMessageHash(this.moduleConfig.zupassWatermark).toString();
    this.pcdNullifier = generateSnarkMessageHash(this.moduleConfig.zupassExternalNullifier).toString();

    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "Zupass login config", 
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          url: this.moduleConfig.zupassUrl,
          api: this.moduleConfig.zupassApiUrl,
          redirectUrl: this.moduleConfig.redirectUrl,
          event: this.moduleConfig.event,
          watermark: this.pcdWatermark,
          nullifier: this.pcdNullifier,
          loginLogo: this.moduleConfig.loginLogo,
          loginLabel: this.moduleConfig.loginLabel,
          userLabel: this.moduleConfig.userLabel,
          infoHtml: this.moduleConfig.infoHtml,
        };
      }
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 2, "Zupass login check", 
      (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionComplete, 5, "Zupass save session", 
      (session: FaucetSession) => this.processSessionComplete(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRewardFactor, 5, "Zupass reward factor", 
      (session: FaucetSession, rewardFactors: ISessionRewardFactor[]) => this.processSessionRewardFactor(session, rewardFactors)
    );
    ServiceManager.GetService(FaucetWebApi).registerApiEndpoint(
      "zupassCallback", 
      (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => this.processZupassAuthCallback(req, url, body)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    return Promise.resolve();
  }

  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    
    let zupassInfo: IZupassPDCData | null = null;
    if(userInput.zupassToken) {
      try{
        zupassInfo = await this.zupassPCD.parseFaucetToken(userInput.zupassToken);
      } catch(ex) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error while parsing zupass login token: " + ex.toString());
        throw new FaucetError(
          "ZUPASS_TOKEN", 
          "Invalid zupass login token",
        );
      }
    }
    
    if(this.moduleConfig.requireLogin && !zupassInfo) {
      throw new FaucetError(
        "ZUPASS_REQUIRED", 
        "You need to authenticate with your zupass account to use this faucet.",
      );
    }

    if(zupassInfo) {
      this.checkLimit(zupassInfo, session);

      let perks: ZupassGrantPerks = {};
      for(let i = 0; i < this.moduleConfig.grants.length; i++) {
        await this.checkGrant(zupassInfo, this.moduleConfig.grants[i], perks);
      }
      
      session.setSessionData("zupass.data", zupassInfo);
      if(typeof perks.factor === "number")
        session.setSessionData("zupass.factor", perks.factor);
      if(typeof perks.overrideMaxDrop === "number")
        session.setSessionData("overrideMaxDropAmount", perks.overrideMaxDrop.toString());
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
    let zupassInfo = session.getSessionData<IZupassPDCData>("zupass.data");
    if(!zupassInfo)
      return;

    await this.zupassDb.setZupassSession(session.getSessionId(), zupassInfo.attendeeId, zupassInfo.ticketId, zupassInfo.eventId, zupassInfo.productId);
  }

  private async processSessionRewardFactor(session: FaucetSession, rewardFactors: ISessionRewardFactor[]): Promise<void> {
    let zupassFactor = session.getSessionData("zupass.factor");
    if(typeof zupassFactor !== "number")
      return;
    rewardFactors.push({
      factor: zupassFactor,
      module: this.moduleName,
    });
  }

  private async processZupassAuthCallback(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    let authResult = await this.validateZupassProof(url);
    let pageHtml = this.buildCallbackPage(authResult);
    return new FaucetHttpResponse(200, "OK", pageHtml, {
      "Content-Type": "text/html; charset=utf-8",
    });
  }

  private async validateZupassProof(url: IFaucetApiUrl): Promise<any> {
    let proof: string;
    let authResult: any = {};

    if(!(proof = url.query['proof'] as string)) {
      authResult['errorCode'] = "PROOF_MISSING";
      authResult['errorMessage'] = "Missing proof in Zupass PCD authentication flow.";
      return authResult;
    }

    let parsedPCD = JSON.parse(decodeURIComponent(proof));
    if(parsedPCD.type !== "zk-eddsa-event-ticket-pcd") {
      authResult['errorCode'] = "INVALID_PCD";
      authResult['errorMessage'] = "Invalid Zupass PCD type.";
      return authResult;
    }

    let ticket = this.zupassPCD.parseTicket(parsedPCD.pcd);
    if(ticket.claim.watermark !== this.pcdWatermark) {
      authResult['errorCode'] = "INVALID_PCD";
      authResult['errorMessage'] = "Invalid PCD watermark.";
      return authResult;
    }
    if(ticket.claim.externalNullifier !== this.pcdNullifier) {
      authResult['errorCode'] = "INVALID_PCD";
      authResult['errorMessage'] = "Invalid PCD nullifier.";
      return authResult;
    }

    let fields = ["productId", "eventId", "attendeeSemaphoreId", "ticketId"];
    for(let i = 0; i < fields.length; i++) {
      let field = fields[i];
      if(!(field in ticket.claim.partialTicket)) {
        authResult['errorCode'] = "INVALID_PCD";
        authResult['errorMessage'] = "Missing PCD field: " + field + ".";
        return authResult;
      }
    }

    if(this.moduleConfig.verify?.signer && ticket.claim.signer.join(",") !== this.moduleConfig.verify.signer.join(",")) {
      authResult['errorCode'] = "INVALID_PCD";
      authResult['errorMessage'] = "PCD verification failed: invalid signer.";
      return authResult;
    }

    let productIds = this.moduleConfig.verify?.productId || this.moduleConfig.event.productIds || [];
    if(productIds.length > 0 && (!ticket.claim.partialTicket.productId || productIds.indexOf(ticket.claim.partialTicket.productId) === -1)) {
      authResult['errorCode'] = "INVALID_PCD";
      authResult['errorMessage'] = "PCD verification failed: invalid productId.";
      return authResult;
    }

    let eventIds = this.moduleConfig.verify?.eventId || this.moduleConfig.event.eventIds || [];
    if(eventIds.length > 0 && (!ticket.claim.partialTicket.eventId || eventIds.indexOf(ticket.claim.partialTicket.eventId) === -1)) {
      authResult['errorCode'] = "INVALID_PCD";
      authResult['errorMessage'] = "PCD verification failed: invalid eventId.";
      return authResult;
    }

    let isValid = await this.zupassPCD.verifyTicket(ticket);
    if(!isValid) {
      authResult['errorCode'] = "INVALID_PCD";
      authResult['errorMessage'] = "Failed validating PCD integrity.";
      return authResult;
    }

    authResult['data'] = this.zupassPCD.getTicketData(ticket);
    return authResult;
  }

  private buildCallbackPage(authResult) {
    return [
      '<!DOCTYPE html>',
      '<html>',
        '<head>',
          '<meta charset="UTF-8">',
          '<title>' + faucetConfig.faucetTitle + ': Zupass Auth</title>',
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

  private async checkGrant(zupassData: IZupassPDCData, grant: IZupassGrantConfig, perks: ZupassGrantPerks): Promise<void> {
    let finishedSessions = await this.zupassDb.getZupassSessions(zupassData.attendeeId, grant.duration, true);

    if(grant.limitCount > 0 && finishedSessions.length >= grant.limitCount) {
      if(!grant.required)
        return;
      let errMsg = grant.message || [
        "You have already created ",
        finishedSessions.length,
        (finishedSessions.length > 1 ? " sessions" : " session"), 
        " in the last ",
        renderTimespan(grant.duration)
      ].join("");
      throw new FaucetError(
        "ZUPASS_LIMIT", 
        errMsg,
      );
    }

    if(grant.limitAmount > 0) {
      if(!grant.required)
        return;
      let totalAmount = 0n;
      finishedSessions.forEach((session) => totalAmount += BigInt(session.dropAmount));
      if(totalAmount >= BigInt(grant.limitAmount)) {
        let errMsg = grant.message || [
          "You have already requested ",
          ServiceManager.GetService(EthWalletManager).readableAmount(totalAmount),
          " in the last ",
          renderTimespan(grant.duration)
        ].join("");
        throw new FaucetError(
          "ZUPASS_LIMIT", 
          errMsg,
        );
      }
    }

    // apply perks
    if(grant.skipModules) {
      perks.skipModules = grant.skipModules
    }
    if(typeof grant.rewardFactor === "number") {
      perks.factor = grant.rewardFactor;
    }
    if(typeof grant.overrideMaxDrop !== "undefined") {
      perks.overrideMaxDrop = grant.overrideMaxDrop;
    }
  }

  private checkLimit(zupassData: IZupassPDCData, session: FaucetSession): void {
    if(this.moduleConfig.concurrencyLimit === 0)
      return;
    
    let activeSessions = ServiceManager.GetService(SessionManager).getActiveSessions();
    let concurrentSessionCount = activeSessions.filter((sess) => {
      if(sess === session)
        return false;
      let zupassInfo = sess.getSessionData<IZupassPDCData>("zupass.data");
      if(!zupassInfo)
        return false;
      return zupassInfo.attendeeId === zupassData.attendeeId;
    }).length;

    if(concurrentSessionCount >= this.moduleConfig.concurrencyLimit) {
      throw new FaucetError(
        "ZUPASS_CONCURRENCY_LIMIT", 
        "Only " + this.moduleConfig.concurrencyLimit + " concurrent sessions allowed per ticket holder",
      );
    }
  }

}
