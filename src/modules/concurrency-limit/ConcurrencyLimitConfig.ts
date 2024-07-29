import { IBaseModuleConfig } from "../BaseModule.js";

export interface IConcurrencyLimitConfig extends IBaseModuleConfig {
  concurrencyLimitByIP: number;
  concurrencyLimitByUserAndTargetAddress: number;
  byAddrOnly: boolean;
  byIPOnly: boolean;
  messageByAddr: string;
  messageByIP: string;
}

export const defaultConfig: IConcurrencyLimitConfig = {
  enabled: false,
  concurrencyLimitByIP: 0,
  concurrencyLimitByUserAndTargetAddress: 0,
  byAddrOnly: false,
  byIPOnly: false,
  messageByAddr: null,
  messageByIP: null,
};
