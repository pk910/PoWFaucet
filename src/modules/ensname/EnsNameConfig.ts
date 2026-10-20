import { IBaseModuleConfig } from "../BaseModule.js";

export interface IEnsNameConfig extends IBaseModuleConfig {
  rpcHost: string; // ETH execution layer RPC host for ENS resolver
  ensAddr: string | null; // ENS registry contract address or null for the mainnet registry
  universalResolver: string | null; // ENS Universal Resolver address: resolves wildcard and offchain (CCIP-read) names too; null = registry lookup only
  required: boolean;
}

export const defaultConfig: IEnsNameConfig = {
  enabled: false,
  rpcHost: null,
  ensAddr: null,
  universalResolver: null,
  required: false,
}
