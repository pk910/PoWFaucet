import fetch from 'node-fetch';
import * as hcaptcha from "hcaptcha";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess";
import { ServiceManager } from "../../common/ServiceManager";
import { FaucetSession, FaucetSessionStoreData } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { ICaptchaConfig } from "./CaptchaConfig";
import { FaucetError } from '../../common/FaucetError';

export class CaptchaModule extends BaseModule<ICaptchaConfig> {

  protected override startModule(): Promise<void> {
    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "captcha config", 
      async (clientConfig: any) => {
        clientConfig[this.moduleName] = {
          provider: this.moduleConfig.provider,
          siteKey: this.moduleConfig.siteKey,
          requiredForStart: this.moduleConfig.checkSessionStart,
          requiredForClaim: this.moduleConfig.checkBalanceClaim,
        };
      }
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 1, "captcha check", 
      async (session: FaucetSession, userInput: any) => this.processSessionStart(session, userInput)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionClaim, 1, "captcha check", 
      async (sessionData: FaucetSessionStoreData, userInput: any) => this.processSessionClaim(sessionData, userInput)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    // nothing to do
    return Promise.resolve();
  }
  
  private async processSessionStart(session: FaucetSession, userInput: any): Promise<void> {
    if(!this.moduleConfig.checkSessionStart)
      return;
    if(!userInput.captchaToken)
      throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: captcha token missing");
    
    let result = await this.verifyToken(userInput.captchaToken, session.getRemoteIP(), "session");
    if(typeof result === "string")
      session.setSessionData("captcha.ident", result);
    else if(!result)
      throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: invalid token");
  }

  private async processSessionClaim(sessionData: FaucetSessionStoreData, userInput: any): Promise<void> {
    if(!this.moduleConfig.checkBalanceClaim)
      return;
    if(!userInput.captchaToken)
      throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: captcha token missing");
    
    let result = await this.verifyToken(userInput.captchaToken, sessionData.remoteIP, "claim");
    if(!result)
      throw new FaucetError("INVALID_CAPTCHA", "captcha check failed: invalid token");
  }

  public async verifyToken(token: string, remoteIp: string, variant: string): Promise<boolean|string> {
    switch(this.moduleConfig.provider) {
      case "hcaptcha":
        return await this.verifyHCaptchaToken(token, remoteIp);
      case "recaptcha":
        return await this.verifyReCaptchaToken(token, remoteIp);
      case "custom":
        return await this.verifyCustomToken(token, remoteIp, variant);
      default:
        return true;
    }
  }
  
  private async verifyHCaptchaToken(token: string, remoteIp: string): Promise<boolean> {
    let hcaptchaResponse = await hcaptcha.verify(this.moduleConfig.secret, token, remoteIp, this.moduleConfig.siteKey);
    return hcaptchaResponse.success;
  }

  private async verifyReCaptchaToken(token: string, remoteIp: string): Promise<boolean> {
    let verifyData = new URLSearchParams();
    verifyData.append("secret", this.moduleConfig.secret);
    verifyData.append("response", token);
    verifyData.append("remoteip", remoteIp);

    let verifyRsp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: 'POST',
      body: verifyData,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }).then((rsp) => rsp.json());

    if(!verifyRsp || !verifyRsp.success)
      return false;
    return true;
  }

  private async verifyCustomToken(token: string, remoteIp: string, variant: string): Promise<boolean|string> {
    let verifyData = new URLSearchParams();
    verifyData.append("response", token);
    verifyData.append("remoteip", remoteIp);
    verifyData.append("variant", variant);

    let verifyRsp = await fetch(this.moduleConfig.secret, {
      method: 'POST',
      body: verifyData,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }).then((rsp) => rsp.json());

    if(!verifyRsp || !verifyRsp.success) {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Captcha verification failed: " + (verifyRsp?.info || ""));
      return false;
    }
    return verifyRsp.ident || true;
  }

}
