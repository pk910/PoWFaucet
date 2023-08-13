import { ServiceManager } from "../../common/ServiceManager";
import { faucetConfig } from "../../config/FaucetConfig";
import { FaucetDatabase } from "../../db/FaucetDatabase";
import { EthClaimManager } from "../../eth/EthClaimManager";
import { EthWalletManager } from "../../eth/EthWalletManager";
import { EthWalletRefill } from "../../eth/EthWalletRefill";
import { FaucetBalanceModule } from "../../modules/faucet-balance/FaucetBalanceModule";
import { FaucetOutflowModule } from "../../modules/faucet-outflow/FaucetOutflowModule";
import { ModuleManager } from "../../modules/ModuleManager";
import { SessionManager } from "../../session/SessionManager";
import { getHashedIp, getHashedSessionId } from "../../utils/HashedInfo";

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
      ipInfo: session.data["ipinfo.data"],
      balance: session.dropAmount,
      nonce: session.data["pow.lastNonce"],
      hashrate: session.data["pow.hashrate"],
      status: session.status,
      restr: session.data["ipinfo.restriction.data"],
      cliver: session.data["cliver"],
      boost: session.data["passport.score"],
      connected: runningSession ? !!runningSession.getSessionModuleRef("pow.client") : null,
      idle: session.data["pow.idleTime"],
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