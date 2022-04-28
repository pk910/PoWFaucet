
export interface IFaucetConfig {
  faucetTitle: string;
  faucetStatus: IFaucetStatus[];
  faucetImage: string;
  faucetHtml: string;
  hcapSiteKey: string | null;
  hcapSession: boolean;
  hcapClaim: boolean;
  shareReward: number;
  minClaim: number;
  maxClaim: number;
  powTimeout: number;
  claimTimeout: number;
  powParams: PoWParams;
  powNonceCount: number;
  resolveEnsNames: boolean;
  ethTxExplorerLink: string;
}

export enum PoWHashAlgo {
  SCRYPT      = "sc",
  CRYPTONIGHT = "cn",
}

export type PoWParams = {
  a: PoWHashAlgo.SCRYPT,
  n: number; // cpu and memory cost
  r: number; // block size
  p: number; // paralellization
  l: number; // key length
  d: number; // difficulty
} | {
  a: PoWHashAlgo.CRYPTONIGHT,
  c: number; // cn-algo
  v: number; // variant
  h: number; // height
  d: number; // difficulty
}

export interface IFaucetStatus {
  text: string;
  level: string;
  ishtml: boolean;
}
