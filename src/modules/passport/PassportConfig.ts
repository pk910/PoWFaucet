import { IBaseModuleConfig } from "../BaseModule";

export interface IPassportConfig extends IBaseModuleConfig {
  scorerApiKey: string;
  passportCachePath: string;
  trustedIssuers: string[];
  refreshCooldown: number;
  cacheTime: number;
  stampDeduplicationTime: number;
  stampScoring: {[stamp: string]: number};
  boostFactor: {[score: number]: number};
}
