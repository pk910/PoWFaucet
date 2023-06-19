import { IBaseModuleConfig } from "../BaseModule";

export interface IIPInfoConfig extends IBaseModuleConfig {
  apiUrl: string; // ip info lookup api url (defaults: http://ip-api.com/json/{ip}?fields=21155839)
  cacheTime: number; // ip info caching time
  required: boolean; // require valid ip info for session start / resume / recovery
  restrictions: null | { // ip based restrictions
    hosting?: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP is in a hosting range
    proxy?: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP is in a proxy range
    [country: string]: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP is from given country code (DE/US/...)
  };
  restrictionsPattern: null | { // ip info pattern based restrictions
    [pattern: string]: number | IIPInfoRestrictionConfig; // percentage of reward per share if IP info matches regex pattern
  };
  restrictionsFile: null | { // ip info pattern based restrictions from file
    file?: string; // path to file
    yaml?: string|string[]; // path to yaml file (for more actions/kill messages/etc.)
    refresh: number; // refresh interval
  };
}

export interface IIPInfoRestrictionConfig {
  reward: number;
  msgkey?: string;
  message?: string;
  notify?: boolean|string;
  blocked?: boolean|"close"|"kill";
}

export const defaultConfig: IIPInfoConfig = {
  enabled: false,
  apiUrl: "http://ip-api.com/json/{ip}?fields=21155839",
  cacheTime: 86400,
  required: false,
  restrictions: null,
  restrictionsPattern: {},
  restrictionsFile: null,
}
