import { IBaseModuleConfig } from "../BaseModule";

export interface IFaucetOutflowConfig extends IBaseModuleConfig {
  amount: number;
  duration: number;
  lowerLimit: number;
  upperLimit: number;
}
