import { IBaseModuleConfig } from "../BaseModule";

export interface IEnsNameConfig extends IBaseModuleConfig {
  rpcHost: string; // ETH execution layer RPC host for ENS resolver
  ensAddr: string | null; // ENS Resolver contract address or null for default resolver
  required: boolean;
}
