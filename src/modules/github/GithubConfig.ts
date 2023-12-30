import { IBaseModuleConfig } from "../BaseModule.js";

export interface IGithubConfig extends IBaseModuleConfig {
  appClientId: string;
  appSecret: string;
  callbackState: string;
  redirectUrl: string;
  authTimeout: number;
  cacheTime: number;
  checks: IGithubCheckConfig[];
  restrictions: IGithubRestrictionConfig[];
}

export interface IGithubCheckConfig {
  minAccountAge?: number;
  minRepoCount?: number;
  minFollowers?: number;
  minOwnRepoCount?: number;
  minOwnRepoStars?: number;
  required?: boolean;
  message?: string;
  rewardFactor?: number;
}

export interface IGithubRestrictionConfig {
  limitCount: number;
  limitAmount: number;
  duration: number;
  message?: string;
}

export const defaultConfig: IGithubConfig = {
  enabled: false,
  appClientId: null,
  appSecret: null,
  callbackState: null,
  redirectUrl: null,
  authTimeout: 86400,
  cacheTime: 86400,
  checks: [],
  restrictions: [],
}
