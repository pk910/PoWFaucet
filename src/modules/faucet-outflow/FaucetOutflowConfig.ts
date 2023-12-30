import { IBaseModuleConfig } from "../BaseModule.js";

export interface IFaucetOutflowConfig extends IBaseModuleConfig {
  amount: number;
  duration: number;
  lowerLimit: number;
  upperLimit: number;
}

export const defaultConfig: IFaucetOutflowConfig = {
  enabled: false,
  amount: 0,
  duration: 86400,
  lowerLimit: 0,
  upperLimit: 0,
}
