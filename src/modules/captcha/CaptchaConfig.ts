import { IBaseModuleConfig } from "../BaseModule";

export interface ICaptchaConfig extends IBaseModuleConfig {
  provider: "hcaptcha"|"recaptcha"|"custom";
  siteKey: string; // site key
  secret: string; // secret key
  checkSessionStart: boolean; // require captcha to start a new mining session
  checkBalanceClaim: boolean; // require captcha to claim mining rewards
}

export const defaultConfig: ICaptchaConfig = {
  enabled: false,
  provider: null,
  siteKey: null,
  secret: null,
  checkSessionStart: false,
  checkBalanceClaim: false,
}
