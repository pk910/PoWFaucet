import fetch from 'node-fetch';
import * as hcaptcha from "hcaptcha";
import { faucetConfig } from "../common/FaucetConfig";

export class CaptchaVerifier {

  public async verifyToken(token: string, remoteIp: string): Promise<boolean> {
    if(!faucetConfig.captchas)
      return true;
    
    switch(faucetConfig.captchas.provider) {
      case "hcaptcha":
        return await this.verifyHCaptchaToken(token, remoteIp);
      case "recaptcha":
        return await this.verifyReCaptchaToken(token, remoteIp);
      default:
        return true;
    }
  }
  
  private async verifyHCaptchaToken(token: string, remoteIp: string): Promise<boolean> {
    let hcaptchaResponse = await hcaptcha.verify(faucetConfig.captchas.secret, token, remoteIp, faucetConfig.captchas.siteKey);
    return hcaptchaResponse.success;
  }

  private async verifyReCaptchaToken(token: string, remoteIp: string): Promise<boolean> {
    let verifyRsp = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: 'POST',
      body: JSON.stringify({
        secret: faucetConfig.captchas.secret,
        response: token,
        remoteip: remoteIp,
      }),
      headers: {'Content-Type': 'application/json'}
    });

    if(!verifyRsp || !verifyRsp.success)
      return false;
    return true;
  }

}
