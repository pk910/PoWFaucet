import { IBaseModuleConfig } from "../BaseModule";

export interface IGithubConfig extends IBaseModuleConfig {
  appClientId: string;
  appSecret: string;
  authTimeout: number;

  restrictions: IGithubRestrictionConfig[];
}

export interface IGithubRestrictionConfig {
  limitCount: number;
  limitAmount: number;
  duration: number;
  byAddrOnly?: true;
  byIPOnly?: true;
  message?: string;
}

export const defaultConfig: IGithubConfig = {
  enabled: false,
  appClientId: null,
  appSecret: null,
  authTimeout: 86400,
  restrictions: [],
}
