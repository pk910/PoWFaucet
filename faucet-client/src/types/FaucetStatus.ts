
export interface IClientClaimStatus {
  time: number;
  session: string;
  target: string;
  amount: string;
  status: string;
  error: string;
  nonce: number;
  hash: string;
  txhex: string;
}

export interface IClientSessionStatus {
  id: string;
  start: number;
  target: string;
  ip: string;
  ipInfo: IClientSessionIPInfo,
  balance: string;
  nonce: number;
  hashrate: number;
  status: string;
  restr: IClientSessionRestrictionStatus;
  cliver: string;
  boost: any;
  connected: boolean;
  idle: number;
}

export interface IClientClaimStatusRsp {
  claims: IClientClaimStatus[];
}

export interface IClientFaucetStatusRsp {
  status: IFaucetStatusGeneralStatus;
  refill: IFaucetStatusRefillStatus;
  outflowRestriction: IFaucetStatusOutflowStatus;
  sessions: IClientSessionStatus[];
  claims: IClientClaimStatus[];
}

export interface IFaucetStatusGeneralStatus {
  walletBalance: number;
  unclaimedBalance: number;
  queuedBalance: number;
  balanceRestriction: number;
}

export interface IFaucetStatusRefillStatus {
  balance: number;
  trigger: number;
  amount: number;
  cooldown: number;
}

export interface IFaucetStatusOutflowStatus {
  now: number;
  trackTime: number;
  balance: number;
  dustAmount: number;
  restriction: number;
  amount: number;
  duration: number;
  lowerLimit: number;
  upperLimit: number;
}


export interface IClientSessionIPInfo {
  status: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionCode?: string;
  city?: string;
  cityCode?: string;
  locLat?: number;
  locLon?: number;
  zone?: string;
  isp?: string;
  org?: string;
  as?: string;
  proxy?: boolean;
  hosting?: boolean;
}

export interface IClientSessionRestrictionStatus {
  reward: number;
  messages: {
    text: string;
    notify: boolean|string;
  }[];
  blocked: false|"close"|"kill";
}