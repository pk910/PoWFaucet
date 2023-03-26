
export interface IFaucetConfig {
  faucetTitle: string;
  faucetStatus: IFaucetStatus[];
  faucetImage: string;
  faucetHtml: string;
  faucetCoinSymbol: string;
  hcapProvider: string;
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
  powHashrateLimit: number;
  resolveEnsNames: boolean;
  ethTxExplorerLink: string;
  time: number;
  resultSharing: {
    preHtml?: string;
    postHtml?: string;
    caption?: string;
    [provider: string]: string;
  };
  passportBoost?: {
    refreshTimeout: number;
    manualVerification: boolean;
    stampScoring: {[stamp: string]: number};
    boostFactor: {[score: number]: number};
  };
}

export enum PoWHashAlgo {
  SCRYPT      = "scrypt",
  CRYPTONIGHT = "cryptonight",
  ARGON2      = "argon2",
}

export type PoWParams = {
  a: PoWHashAlgo.SCRYPT,
  n: number; // cpu and memory cost
  r: number; // block size
  p: number; // parallelization
  l: number; // key length
  d: number; // difficulty
} | {
  a: PoWHashAlgo.CRYPTONIGHT,
  c: number; // cn-algo
  v: number; // variant
  h: number; // height
  d: number; // difficulty
} | {
  a: PoWHashAlgo.ARGON2;
  t: number; // type
  v: number; // version
  i: number; // timeCost
  m: number; // memoryCost
  p: number; // parallelization,
  l: number; // keyLength
  d: number; // difficulty
}


export interface IFaucetStatus {
  text: string;
  level: string;
  ishtml: boolean;
}
