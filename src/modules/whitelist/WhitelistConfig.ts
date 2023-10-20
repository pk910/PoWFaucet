import { IBaseModuleConfig } from "../BaseModule";

export interface IWhitelistConfig extends IBaseModuleConfig {
  whitelistPattern: { // ip info pattern based restrictions
    [pattern: string]: IWhitelistEntryConfig; // percentage of reward per share if IP info matches regex pattern
  };
  whitelistFile: null | { // ip info pattern based restrictions from file
    yaml: string|string[]; // path to yaml file (for more actions/kill messages/etc.)
    refresh: number; // refresh interval
  };
}

export interface IWhitelistEntryConfig {
  reward: number;
  skipModules?: string[];
  msgkey?: string;
  message?: string;
  notify?: boolean|string;
}

export const defaultConfig: IWhitelistConfig = {
  enabled: false,
  whitelistPattern: {},
  whitelistFile: null,
}
