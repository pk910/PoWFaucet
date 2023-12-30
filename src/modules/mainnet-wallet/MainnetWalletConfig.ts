import { IBaseModuleConfig } from "../BaseModule.js";

export interface IMainnetWalletConfig extends IBaseModuleConfig {
  rpcHost: string;
  minTxCount: number;
  minBalance: number;
}

export const defaultConfig: IMainnetWalletConfig = {
  enabled: false,
  rpcHost: null,
  minTxCount: 0,
  minBalance: 0,
}
