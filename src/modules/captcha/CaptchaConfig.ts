import { IBaseModuleConfig } from "../BaseModule";

export interface ICaptchaConfig extends IBaseModuleConfig {
  provider: "hcaptcha"|"recaptcha"|"custom";
  siteKey: string; // site key
  secret: string; // secret key
  checkSessionStart: boolean; // require captcha to start a new mining session
  checkBalanceClaim: boolean; // require captcha to claim mining rewards
}
