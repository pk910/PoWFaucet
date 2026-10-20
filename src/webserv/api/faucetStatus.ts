import { ServiceManager } from "../../common/ServiceManager.js";
import { faucetConfig } from "../../config/FaucetConfig.js";
import { FaucetDatabase } from "../../db/FaucetDatabase.js";
import { EthClaimManager } from "../../eth/EthClaimManager.js";
import { EthWalletManager } from "../../eth/EthWalletManager.js";
import { EthWalletRefill } from "../../eth/EthWalletRefill.js";
import { IRpcEndpointStatus } from "../../eth/RpcEndpointPool.js";
import { FaucetBalanceModule } from "../../modules/faucet-balance/FaucetBalanceModule.js";
import { FaucetOutflowModule } from "../../modules/faucet-outflow/FaucetOutflowModule.js";
import { ModuleManager } from "../../modules/ModuleManager.js";
import { SessionManager } from "../../session/SessionManager.js";
import { ISessionRewardFactor } from "../../session/SessionRewardFactor.js";
import { FaucetSessionStoreData } from "../../session/FaucetSession.js";
import { getHashedIp, getHashedSessionId } from "../../utils/HashedInfo.js";
import { sha256 } from "../../utils/CryptoUtils.js";

/** The operator's key: unmasks the status list and the session details. */
export function isOperatorKey(key: string | undefined): boolean {
  return !!key && key === getOperatorKey();
}

/** The operator's key, derived from the faucet secret (a hash of it: knowing the key reveals nothing of the secret). Printed to the log at startup. */
export function getOperatorKey(): string {
  return sha256(faucetConfig.faucetSecret + "-unmasked");
}

/**
 * Modules whose reward factor applies to every session alike (the faucet is low on funds, the
 * outflow limit is reached). Showing those tells nobody anything about themselves.
 */
export const GLOBAL_FACTOR_MODULES = ["faucet-balance", "faucet-outflow"];

/**
 * The reward factors a session may be shown without the operator's key.
 *
 * A factor below 1 that is specific to the session - an ip range, a recurring limit, a module's
 * own penalty - is the faucet having caught something, and a farmer who could read that off the
 * page would learn which of their setups still works. So the whole list is left out as soon as
 * one such factor is in it: an incomplete list would be the same tell.
 */
export function publicRewardFactors(factors: ISessionRewardFactor[] | undefined): ISessionRewardFactor[] | undefined {
  if(!factors)
    return undefined;
  let caught = factors.some((factor) => factor.factor < 1 && GLOBAL_FACTOR_MODULES.indexOf(factor.module) === -1);
  return caught ? undefined : factors;
}

/** Without the key the public status list shows where a session comes from, not through whom. */
export function publicIpInfo(ipInfo: any): any {
  if(!ipInfo)
    return ipInfo;
  return {
    status: ipInfo.status,
    country: ipInfo.country,
    countryCode: ipInfo.countryCode,
  };
}

export interface IClientSessionDetails {
  data: {[key: string]: any};
  claim: any;
  /** the session's address, with the operator's key only */
  ip?: string;
}

/** session data anyone with the session id may read */
const PUBLIC_DATA_KEYS = [
  "cliver",
  "close.time",
  "pow.lastNonce",
  "pow.shareCount",
  "pow.hashrate",
  "passport.score",
  "github.user",
];

/**
 * What `getSessionStatus?details=1` hands out.
 *
 * The session's data map holds everything the modules noted while the session ran, and some of
 * it identifies the visitor (ip and ip info, captcha ident, passport stamps, github uid, ticket
 * identifiers, the pow preimage) or the faucet's judgement of them (restrictions, skipped
 * modules). With the operator's key the map comes as it is, plus the ip; without it the map is
 * rebuilt from an allowlist, and the claim loses the signed transaction.
 */
export function buildSessionDetails(session: FaucetSessionStoreData, unmasked: boolean): IClientSessionDetails {
  if(unmasked) {
    return {
      data: session.data,
      claim: session.claim,
      ip: session.remoteIP,
    };
  }
  let data: {[key: string]: any} = {};
  let sessionData = session.data || {};
  PUBLIC_DATA_KEYS.forEach((key) => {
    if(sessionData[key] !== undefined)
      data[key] = sessionData[key];
  });
  let factors = publicRewardFactors(sessionData["reward.factors"]);
  if(factors)
    data["reward.factors"] = factors;
  if(sessionData["ticketproof.data"]) {
    data["ticketproof.data"] = {
      tier: sessionData["ticketproof.data"].tier,
      event: sessionData["ticketproof.data"].event,
    };
  }
  let claim = session.claim ? {
    claimIdx: session.claim.claimIdx,
    claimStatus: session.claim.claimStatus,
    claimTime: session.claim.claimTime,
    txHash: session.claim.txHash,
    txBlock: session.claim.txBlock,
    txNonce: session.claim.txNonce,
    txError: session.claim.txError,
  } : session.claim;
  return {
    data: data,
    claim: claim,
  };
}

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
  ipInfo: any,
  balance: string;
  nonce: number;
  hashrate: number;
  status: string;
  restr: any;
  cliver: string;
  boost: any;
  connected: boolean;
  idle: number;
  factors: ISessionRewardFactor[];
}

export interface IClientFaucetStatus {
  status: {
    walletBalance: string;
    unclaimedBalance: string;
    queuedBalance: string;
    balanceRestriction: number;
  };
  refill: {
    balance: string;
    trigger: string;
    amount: string;
    cooldown: number;
  };
  outflowRestriction: {
    now: number;
    trackTime: number;
    dustAmount: string;
    balance: string;

    restriction: number;
    amount: number;
    duration: number;
    lowerLimit: number;
    upperLimit: number;
  };
  rpcEndpoints: IRpcEndpointStatus[];
}

export interface IClientSessionsStatus {
  sessions: IClientSessionStatus[];
}

export interface IClientQueueStatus {
  claims: IClientClaimStatus[];
}


export async function buildFaucetStatus(): Promise<IClientFaucetStatus> {
  let moduleManager = ServiceManager.GetService(ModuleManager);
  let sessionManager = ServiceManager.GetService(SessionManager);
  let ethClaimManager = ServiceManager.GetService(EthClaimManager);
  let ethWalletManager = ServiceManager.GetService(EthWalletManager);
  let ethWalletRefill = ServiceManager.GetService(EthWalletRefill);

  let statusRsp: IClientFaucetStatus = {
    status: {
      walletBalance: ethWalletManager.getFaucetBalance()?.toString(),
      unclaimedBalance: (await sessionManager.getUnclaimedBalance()).toString(),
      queuedBalance: ethClaimManager.getQueuedAmount().toString(),
      balanceRestriction: moduleManager.getModule<FaucetBalanceModule>("faucet-balance")?.getBalanceRestriction() || 100,
    },
    outflowRestriction: moduleManager.getModule<FaucetOutflowModule>("faucet-outflow")?.getOutflowDebugState(),
    refill: faucetConfig.ethRefillContract && faucetConfig.ethRefillContract.contract ? {
      balance: (await ethWalletManager.getWalletBalance(faucetConfig.ethRefillContract.contract)).toString(),
      trigger: faucetConfig.ethRefillContract.triggerBalance.toString(),
      amount: faucetConfig.ethRefillContract.requestAmount.toString(),
      cooldown: ethWalletRefill.getFaucetRefillCooldown(),
    } : null,
    rpcEndpoints: ethWalletManager.getRpcPool()?.getStatusList() || [],
  };

  return statusRsp;
}

export async function buildSessionStatus(unmasked?: boolean): Promise<IClientSessionsStatus> {
  let sessionsRsp: IClientSessionsStatus = {
    sessions: null,
  };

  let sessions = await ServiceManager.GetService(FaucetDatabase).getAllSessions(86400);
  let sessionManager = ServiceManager.GetService(SessionManager);
  sessionsRsp.sessions = sessions.map((session) => {
    let runningSession = sessionManager.getSession(session.sessionId);
    return {
      id: unmasked ? session.sessionId : getHashedSessionId(session.sessionId, faucetConfig.faucetSecret),
      start: session.startTime,
      target: session.targetAddr,
      ip: unmasked ? session.remoteIP : getHashedIp(session.remoteIP, faucetConfig.faucetSecret),
      ipInfo: unmasked ? session.data["ipinfo.data"] : publicIpInfo(session.data["ipinfo.data"]),
      balance: session.dropAmount,
      nonce: session.data["pow.lastNonce"],
      hashrate: session.data["pow.hashrate"],
      status: session.status,
      restr: unmasked ? session.data["ipinfo.restriction.data"] : undefined,
      cliver: session.data["cliver"],
      boost: session.data["passport.score"],
      connected: runningSession ? !!runningSession.getSessionModuleRef("pow.clientActive") : null,
      idle: session.data["pow.idleTime"],
      factors: unmasked ? session.data["reward.factors"] : publicRewardFactors(session.data["reward.factors"]),
    }
  });

  return sessionsRsp;
}

export function buildQueueStatus(unmasked?: boolean): IClientQueueStatus {
  let claims = ServiceManager.GetService(EthClaimManager).getTransactionQueue();
  let rspClaims = claims.map((claimTx) => {
    return {
      time: claimTx.claim.claimTime,
      session: unmasked ? claimTx.session : getHashedSessionId(claimTx.session, faucetConfig.faucetSecret),
      target: claimTx.target,
      amount: claimTx.amount.toString(),
      status: claimTx.claim.claimStatus,
      error: claimTx.claim.txError,
      nonce: claimTx.claim.txNonce || null,
      hash: claimTx.claim.txHash || null,
      txhex: claimTx.claim.txHex || null,
    }
  });

  return {
    claims: rspClaims,
  };
}