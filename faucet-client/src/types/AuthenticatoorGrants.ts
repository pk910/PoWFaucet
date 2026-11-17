
// A selectable authenticatoor grant, as GET /authenticatoorGrants lists it for a login.
export interface IAuthenticatoorGrantInfo {
  id: string;
  name: string;
  description: string | null;
  rewardFactor: number | null;
  // fixed drop amount (wei), null when the grant pays no fixed drop
  dropAmount: string | null;
  noMining: boolean;
  limitCount: number;
  limitAmount: string;
  duration: number;
  usedCount: number;
  usedAmount: string;
  available: boolean;
  // unix time the grant can be used again; null while it is available
  nextAvailable: number | null;
}

export interface IAuthenticatoorGrantsRsp {
  grants?: IAuthenticatoorGrantInfo[];
  errorCode?: string;
  errorMessage?: string;
}
