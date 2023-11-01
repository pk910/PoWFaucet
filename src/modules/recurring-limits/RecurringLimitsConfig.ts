import { IBaseModuleConfig } from "../BaseModule";

export interface IRecurringLimitsConfig extends IBaseModuleConfig {
  limits: IRecurringLimitConfig[];
}

export interface IRecurringLimitConfig {
  limitCount: number;
  limitAmount: number;
  duration: number;
  byAddrOnly?: true;
  byIPOnly?: true;
  ip4Subnet?: number;
  action?: string;
  message?: string;
  rewards?: number;
}

export const defaultConfig: IRecurringLimitsConfig = {
  enabled: false,
  limits: [],
}
