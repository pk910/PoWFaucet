import { IBaseModuleConfig } from "../BaseModule.js";

export interface IEnsNameConfig extends IBaseModuleConfig {
  rpcHost: string; // ETH execution layer RPC host for ENS resolver
  ensAddr: string | null; // ENS Resolver contract address or null for default resolver
  required: boolean;
}

export const defaultConfig: IEnsNameConfig = {
  enabled: false,
  rpcHost: null,
  ensAddr: null,
  required: false,
}
