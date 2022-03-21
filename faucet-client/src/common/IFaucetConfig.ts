
export interface IFaucetConfig {
  faucetTitle: string;
  faucetImage: string;
  hcapSiteKey: string | null;
  hcapSession: boolean;
  hcapClaim: boolean;
  shareReward: number;
  minClaim: number;
  maxClaim: number;
  powTimeout: number;
  claimTimeout: number;
  powParams: IPoWParams;
  powNonceCount: number;
}

export interface IPoWParams {
  n: number; // cpu and memory cost
  r: number; // block size
  p: number; // paralellization
  l: number; // key length
  d: number; // difficulty
}
