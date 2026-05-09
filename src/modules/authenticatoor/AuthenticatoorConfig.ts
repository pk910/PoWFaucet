import { IBaseModuleConfig } from "../BaseModule.js";

export interface IAuthenticatoorConfig extends IBaseModuleConfig {
  authUrl: string;
  expectedAudience: string | null;
  requireLogin: boolean;
  concurrencyLimit: number;
  grants: IAuthenticatoorGrantConfig[];
  loginLabel: string | null;
  userLabel: string | null;
  infoHtml: string | null;
  loginLogo: string | null;
}

export interface IAuthenticatoorGrantConfig {
  limitCount: number;
  limitAmount: number;
  duration: number;
  skipModules?: string[];
  rewardFactor?: number;
  overrideMaxDrop?: number;
  required?: boolean;
  message?: string;
}

export const defaultConfig: IAuthenticatoorConfig = {
  enabled: false,
  authUrl: "",
  expectedAudience: null,
  requireLogin: false,
  concurrencyLimit: 0,
  grants: [],
  loginLabel: null,
  userLabel: null,
  infoHtml: null,
  loginLogo: null,
}
