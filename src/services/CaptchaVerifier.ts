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
      case "custom":
        return await this.verifyCustomToken(token, remoteIp);
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

  private async verifyCustomToken(token: string, remoteIp: string): Promise<boolean> {
    let verifyRsp = await fetch(faucetConfig.captchas.secret, {
      method: 'POST',
      body: JSON.stringify({
        token: token,
        remoteip: remoteIp,
      }),
      headers: {'Content-Type': 'application/json'}
    }).then((rsp) => rsp.json());

    if(!verifyRsp || !verifyRsp.success)
      return false;
    return true;
  }

}
