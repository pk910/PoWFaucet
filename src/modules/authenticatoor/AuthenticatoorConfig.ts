import { IBaseModuleConfig } from "../BaseModule.js";

export interface IAuthenticatoorConfig extends IBaseModuleConfig {
  authUrl: string;
  expectedAudience: string | null;
  expectedHost: string | null;
  expectedService: string | null;
  requireLogin: boolean;
  concurrencyLimit: number;
  grants: IAuthenticatoorGrantConfig[];
  loginLabel: string | null;
  userLabel: string | null;
  infoHtml: string | null;
  loginLogo: string | null;
}

export interface IAuthenticatoorGrantConfig {
  // stable identifier; needed by selectable grants
  id?: string;
  // shown to the user in the grant selection
  name?: string;
  description?: string;
  // applies only when the user selects it, never on its own. Its limits
  // count the user's sessions that selected it; the limits of the other
  // grants count every session of the user.
  selectable?: boolean;
  feature?: string;
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
  expectedHost: null,
  expectedService: null,
  requireLogin: false,
  concurrencyLimit: 0,
  grants: [],
  loginLabel: null,
  userLabel: null,
  infoHtml: null,
  loginLogo: null,
}
