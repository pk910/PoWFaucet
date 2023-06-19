import { IBaseModuleConfig } from "../BaseModule";

export interface IConcurrencyLimitConfig extends IBaseModuleConfig {
  concurrencyLimit: number;
  byAddrOnly: boolean;
  byIPOnly: boolean;
  messageByAddr: string;
  messageByIP: string;
}

export const defaultConfig: IConcurrencyLimitConfig = {
  enabled: false,
  concurrencyLimit: 0,
  byAddrOnly: false,
  byIPOnly: false,
  messageByAddr: null,
  messageByIP: null,
}
