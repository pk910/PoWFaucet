import { IBaseModuleConfig } from "../BaseModule";

export interface IEthInfoConfig extends IBaseModuleConfig {
  maxBalance: number;
  denyContract: boolean;
}
