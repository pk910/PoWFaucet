import { IBaseModuleConfig } from "../BaseModule.js";

export interface IFaucetBalanceConfig extends IBaseModuleConfig {
  fixedRestriction: {
    [limit: number]: number; // limit: min balance in wei, value: percent of normal reward (eg. 50 = half rewards)
  };
  dynamicRestriction: {
    targetBalance: number;
  }
}

export const defaultConfig: IFaucetBalanceConfig = {
  enabled: false,
  fixedRestriction: null,
  dynamicRestriction: null,
}
