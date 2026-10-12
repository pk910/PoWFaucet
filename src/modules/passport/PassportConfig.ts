import { IBaseModuleConfig } from "../BaseModule.js";

export interface IPassportConfig extends IBaseModuleConfig {
  apiUrl: string;
  scorerApiKey: string;
  cachePath: string;
  cacheTime: number;
  trustedIssuers: string[];
  refreshCooldown: number;
  stampDeduplicationTime: number;
  stampScoring: {[stamp: string]: number};
  boostFactor: {[score: number]: number};
  requireMinScore: number;
  skipProxyCheckScore: number;
  skipHostingCheckScore: number;
  allowGuestRefresh: boolean;
  guestRefreshCooldown: number;
}

export const defaultConfig: IPassportConfig = {
  enabled: false,
  apiUrl: "https://api.passport.xyz",
  scorerApiKey: null,
  cachePath: null,
  cacheTime: 86400,
  trustedIssuers: [
    "did:key:z6MkghvGHLobLEdj1bgRLhS4LPGJAvbMA1tn2zcRyqmYU5LC", // legacy Gitcoin Passport issuer (Ed25519)
    "did:ethr:0xd6f8d6ca86aa01e551a311d670a0d1bd8577e5fb", // Human Passport issuer (EIP712)
  ],
  refreshCooldown: 300,
  stampDeduplicationTime: 86400 * 3,
  stampScoring: {},
  boostFactor: {},
  requireMinScore: 0,
  skipProxyCheckScore: 0,
  skipHostingCheckScore: 0,
  allowGuestRefresh: false,
  guestRefreshCooldown: 0,
}
