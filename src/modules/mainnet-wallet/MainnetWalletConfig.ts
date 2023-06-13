import { IBaseModuleConfig } from "../BaseModule";

export interface IMainnetWalletConfig extends IBaseModuleConfig {
  rpcHost: string;
  minTxCount: number;
  minBalance: number;
}
