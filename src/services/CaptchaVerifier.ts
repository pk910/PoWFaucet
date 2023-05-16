import fetch from 'node-fetch';
import * as hcaptcha from "hcaptcha";
import { faucetConfig } from "../common/FaucetConfig";
import { PoWStatusLog, PoWStatusLogLevel } from '../common/PoWStatusLog';
import { ServiceManager } from '../common/ServiceManager';

export class CaptchaVerifier {

  public async verifyToken(token: string, remoteIp: string, variant: string): Promise<boolean|string> {
    if(!faucetConfig.captchas)
      return true;
    
    switch(faucetConfig.captchas.provider) {
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
    let hcaptchaResponse = await hcaptcha.verify(faucetConfig.captchas.secret, token, remoteIp, faucetConfig.captchas.siteKey);
    return hcaptchaResponse.success;
  }

  private async verifyReCaptchaToken(token: string, remoteIp: string): Promise<boolean> {
    let verifyData = new URLSearchParams();
    verifyData.append("secret", faucetConfig.captchas.secret);
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

    let verifyRsp = await fetch(faucetConfig.captchas.secret, {
      method: 'POST',
      body: verifyData,
      headers: {'Content-Type': 'application/x-www-form-urlencoded'}
    }).then((rsp) => rsp.json());

    if(!verifyRsp || !verifyRsp.success) {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Captcha verification failed: " + (verifyRsp?.info || ""));
      return false;
    }
    return verifyRsp.ident || true;
  }

}
