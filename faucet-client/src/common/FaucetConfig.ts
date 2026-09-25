import { PoWHashAlgo } from "../types/PoWMinerSrc";

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
    [provider: string]: string | undefined;
  };
  modules: IFaucetModules;
}

export interface IFaucetModules {
  authenticatoor?: IAuthenticatoorModuleConfig;
  captcha?: ICaptchaModuleConfig;
  ensname?: IEnsNameModuleConfig;
  github?: IGithubModuleConfig;
  pow?: IPoWModuleConfig;
  passport?: IPassportModuleConfig;
  voucher?: IVoucherModuleConfig;
  zupass?: IZupassModuleConfig;
  // A module's own config block is published under its module name, and the core
  // does not know what is in it - the module's client is what reads its shape
  // Only the core's own modules can be named here.
  [module: string]: any;
}

/**
 * True when a running session has something for the mining page to do.
 *
 * Any task at all: mining is the core's own, and everything else belongs to a
 * module that registered a panel to draw it. It used to ask whether the task's
 * module was named with a particular prefix, which meant the core had to know
 * what one kind of module was before it could decide where to send the player -
 * and, worse, a module named anything else would have been dropped on the floor
 * here with no symptom but a session the page refused to open.
 */
export function hasPlayableTask(tasks: { module: string }[]): boolean {
  if(!tasks)
    return false;
  return tasks.length > 0;
}

export interface IAuthenticatoorModuleConfig {
  authUrl: string;
  requireLogin: boolean;
  loginLabel: string | null;
  userLabel: string | null;
  infoHtml: string | null;
  loginLogo: string | null;
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

export interface IZupassModuleConfig {
  url: string;
  api: string;
  redirectUrl: string;
  event: {
    name: string;
    eventIds: string[];
    productIds: string[];
  };
  watermark: string;
  nullifier: string;
  loginLogo: string;
  loginLabel: string;
  userLabel: string;
  infoHtml: string;
}

export interface IPoWModuleConfig {
  powWsUrl: string;
  powTimeout: number;
  powIdleTimeout: number;
  powParams: PoWParams;
  powDifficulty: number;
  powHashrateLimit: number;
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
} | {
  a: PoWHashAlgo.NICKMINER;
  i: string; // input hash
  r: string; // sigR
  v: number; // sigV
  c: number; // count
  s: string; // suffix
  p: string; // prefix
}

export interface IPassportModuleConfig {
  refreshTimeout: number;
  manualVerification: boolean;
  stampScoring: {[stamp: string]: number};
  boostFactor: {[score: number]: number};
  overrideScores: [number, number, number];
  guestRefresh: number | boolean;
}

export interface IVoucherModuleConfig {
  voucherLabel: string;
  infoHtml: string;
}

export interface IFaucetStatus {
  text: string;
  level: string;
  prio: number;
  ishtml: boolean;
}
