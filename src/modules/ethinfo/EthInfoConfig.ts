import { IBaseModuleConfig } from "../BaseModule.js";

export interface IEthInfoConfig extends IBaseModuleConfig {
  maxBalance: number;
  denyContract: boolean;
}

export const defaultConfig: IEthInfoConfig = {
  enabled: false,
  maxBalance: 0,
  denyContract: false,
}
