
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
  powParams: IPoWParams;
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

export interface IPoWParams {
  n: number; // cpu and memory cost
  r: number; // block size
  p: number; // parallelization
  l: number; // key length
  d: number; // difficulty
}

export interface IFaucetStatus {
  text: string;
  level: string;
  ishtml: boolean;
}
