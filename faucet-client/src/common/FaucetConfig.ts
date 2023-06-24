
export interface IFaucetConfig {
  faucetTitle: string;
  faucetStatus: IFaucetStatus[];
  faucetImage: string;
  faucetHtml: string;
  faucetCoinSymbol: string;
  faucetCoinType: string;
  faucetCoinContract: string;
  faucetCoinDecimals: number;
  minClaim: number;
  maxClaim: number;
  sessionTimeout: number;
  ethTxExplorerLink: string;
  time: number;
  resultSharing: {
    preHtml?: string;
    postHtml?: string;
    caption?: string;
    [provider: string]: string;
  };
  modules: {
    captcha?: ICaptchaModuleConfig;
    ensname?: IEnsNameModuleConfig;
    github?: IGithubModuleConfig;
    pow?: IPoWModuleConfig;
    passport?: IPassportModuleConfig;
  };
}

export interface ICaptchaModuleConfig {
  provider: string;
  siteKey: string;
  requiredForStart: boolean;
  requiredForClaim: boolean;
}

export interface IEnsNameModuleConfig {
  required: boolean;
}

export interface IGithubModuleConfig {
  clientId: string;
  authTimeout: number;
  redirectUrl: string;
  callbackState: string;
}

export interface IPoWModuleConfig {
  powWsUrl: string;
  powTimeout: number;
  powIdleTimeout: number;
  powParams: PoWParams;
  powDifficulty: number;
  powNonceCount: number;
  powHashrateLimit: number;
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
} | {
  a: PoWHashAlgo.CRYPTONIGHT,
  c: number; // cn-algo
  v: number; // variant
  h: number; // height
} | {
  a: PoWHashAlgo.ARGON2;
  t: number; // type
  v: number; // version
  i: number; // timeCost
  m: number; // memoryCost
  p: number; // parallelization,
  l: number; // keyLength
}

export interface IPassportModuleConfig {
  refreshTimeout: number;
  manualVerification: boolean;
  stampScoring: {[stamp: string]: number};
  boostFactor: {[score: number]: number};
}


export interface IFaucetStatus {
  text: string;
  level: string;
  prio: number;
  ishtml: boolean;
}
