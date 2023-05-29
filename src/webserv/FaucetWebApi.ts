import { IncomingMessage } from "http";
import { faucetConfig, IFaucetResultSharingConfig } from "../common/FaucetConfig";
import { FaucetProcess, FaucetLogLevel } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";
import { ClaimTxStatus, EthClaimManager } from "../services/EthClaimManager";
import { EthWalletManager } from "../services/EthWalletManager";
import { EthWalletRefill } from "../services/EthWalletRefill";
import { FaucetStatus, IFaucetStatus } from "../services/FaucetStatus";
import { IIPInfo } from "../services/IPInfoResolver";
import { PoWOutflowLimiter } from "../services/PoWOutflowLimiter";
import { IPoWRewardRestriction, PoWRewardLimiter } from "../services/PoWRewardLimiter";
import { getHashedSessionId } from "../utils/HashedInfo";
import { PoWClient } from "../websock/PoWClient";
import { PoWSession, PoWSessionStatus } from "../websock/PoWSession";
import { FaucetHttpResponse } from "./FaucetWebServer";

export interface IFaucetApiUrl {
  path: string[];
  query: {[key: string]: string|boolean};
}

export interface IClientFaucetConfig {
  faucetTitle: string;
  faucetStatus: IFaucetStatus[];
  faucetStatusHash: string;
  faucetImage: string;
  faucetHtml: string;
  faucetCoinSymbol: string;
  faucetCoinType: string;
  faucetCoinContract: string;
  faucetCoinDecimals: number;
  hcapProvider: string;
  hcapSiteKey: string;
  hcapSession: boolean;
  hcapClaim: boolean;
  shareReward: number;
  rewardFactor: number;
  minClaim: number;
  maxClaim: number;
  powTimeout: number;
  claimTimeout: number;
  powParams: {
    n: number;
    r: number;
    p: number;
    l: number;
    d: number;
  },
  powNonceCount: number;
  powHashrateLimit: number;
  resolveEnsNames: boolean;
  ethTxExplorerLink: string;
  time: number;
  resultSharing: IFaucetResultSharingConfig;
  passportBoost: {
    refreshTimeout: number;
    manualVerification: boolean;
    stampScoring: {[stamp: string]: number};
    boostFactor: {[score: number]: number};
  };
}

export interface IClientSessionStatus {
  id: string;
  start: number;
  idle: number;
  target: string;
  ip: string;
  ipInfo: IIPInfo;
  balance: string;
  nonce: number;
  hashrate: number;
  status: PoWSessionStatus;
  claimable: boolean;
  restr: IPoWRewardRestriction;
  cliver: string;
  boostF: number;
  boostS: number;
}

export interface IClientClaimStatus {
  time: number;
  session: string;
  target: string;
  amount: string;
  status: ClaimTxStatus;
  error: string;
  nonce: number;
  hash: string;
  txhex: string;
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
  sessions: IClientSessionStatus[];
  claims: IClientClaimStatus[];
}

export interface IClientQueueStatus {
  claims: IClientClaimStatus[];
}

const FAUCETSTATUS_CACHE_TIME = 10;

export class FaucetWebApi {
  private cachedFaucetStatus: {time: number, data: IClientFaucetStatus};
  private faucetStatusPromise: Promise<IClientFaucetStatus>;

  public async onApiRequest(req: IncomingMessage): Promise<any> {
    let apiUrl = this.parseApiUrl(req.url);
    if (!apiUrl || apiUrl.path.length === 0)
      return new FaucetHttpResponse(404, "Not Found");
    switch (apiUrl.path[0].toLowerCase()) {
      case "getMaxReward".toLowerCase():
        return this.onGetMaxReward();
      case "getFaucetConfig".toLowerCase():
        return this.onGetFaucetConfig(apiUrl.query['cliver'] as string);
      case "getFaucetStatus".toLowerCase():
        return await this.onGetFaucetStatus((req.headers['x-forwarded-for'] as string || req.socket.remoteAddress).split(", ")[0]);
      case "getQueueStatus".toLowerCase():
        return this.onGetQueueStatus();
    }
    return new FaucetHttpResponse(404, "Not Found");
  }

  private parseApiUrl(url: string): IFaucetApiUrl {
    let urlMatch = /\/api\/([^?]+)(?:\?(.*))?/.exec(url);
    if(!urlMatch)
      return null;
    let urlRes: IFaucetApiUrl = {
      path: urlMatch[1] && urlMatch[1].length > 0 ? urlMatch[1].split("/") : [],
      query: {}
    };
    if(urlMatch[2] && urlMatch[2].length > 0) {
      urlMatch[2].split("&").forEach((query) => {
        let parts = query.split("=", 2);
        urlRes.query[parts[0]] = (parts.length == 1) ? true : parts[1];
      });
    }
    return urlRes;
  }

  private onGetMaxReward(): number {
    return faucetConfig.claimMaxAmount;
  }

  public getFaucetConfig(client?: PoWClient, clientVersion?: string): IClientFaucetConfig {
    let faucetStatus = ServiceManager.GetService(FaucetStatus).getFaucetStatus(client?.getClientVersion() || clientVersion, client?.getSession());
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let faucetHtml = faucetConfig.faucetHomeHtml || "";
    faucetHtml = faucetHtml.replace(/{faucetWallet}/, () => {
      return ethWalletManager.getFaucetAddress();
    });
    return {
      faucetTitle: faucetConfig.faucetTitle,
      faucetStatus: faucetStatus.status,
      faucetStatusHash: faucetStatus.hash,
      faucetImage: faucetConfig.faucetImage,
      faucetHtml: faucetHtml,
      faucetCoinSymbol: faucetConfig.faucetCoinSymbol,
      faucetCoinType: faucetConfig.faucetCoinType,
      faucetCoinContract: faucetConfig.faucetCoinContract,
      faucetCoinDecimals: ethWalletManager.getFaucetDecimals(),
      hcapProvider: faucetConfig.captchas ? faucetConfig.captchas.provider : null,
      hcapSiteKey: faucetConfig.captchas ? faucetConfig.captchas.siteKey : null,
      hcapSession: faucetConfig.captchas && faucetConfig.captchas.checkSessionStart,
      hcapClaim: faucetConfig.captchas && faucetConfig.captchas.checkBalanceClaim,
      shareReward: faucetConfig.powShareReward,
      rewardFactor: ServiceManager.GetService(PoWRewardLimiter).getBalanceRestriction(),
      minClaim: faucetConfig.claimMinAmount,
      maxClaim: faucetConfig.claimMaxAmount,
      powTimeout: faucetConfig.powSessionTimeout,
      claimTimeout: faucetConfig.claimSessionTimeout,
      powParams: {
        n: faucetConfig.powScryptParams.cpuAndMemory,
        r: faucetConfig.powScryptParams.blockSize,
        p: faucetConfig.powScryptParams.parallelization,
        l: faucetConfig.powScryptParams.keyLength,
        d: faucetConfig.powScryptParams.difficulty,
      },
      powNonceCount: faucetConfig.powNonceCount,
      powHashrateLimit: faucetConfig.powHashrateSoftLimit,
      resolveEnsNames: !!faucetConfig.ensResolver,
      ethTxExplorerLink: faucetConfig.ethTxExplorerLink,
      time: Math.floor((new Date()).getTime() / 1000),
      resultSharing: faucetConfig.resultSharing,
      passportBoost: faucetConfig.passportBoost ? {
        refreshTimeout: faucetConfig.passportBoost.refreshCooldown,
        manualVerification: (faucetConfig.passportBoost.trustedIssuers && faucetConfig.passportBoost.trustedIssuers.length > 0),
        stampScoring: faucetConfig.passportBoost.stampScoring,
        boostFactor: faucetConfig.passportBoost.boostFactor,
      } : null,
    };
  }

  private onGetFaucetConfig(clientVersion?: string): IClientFaucetConfig {
    return this.getFaucetConfig(null, clientVersion);
  }

  private async buildFaucetStatus(): Promise<IClientFaucetStatus> {
    let rewardLimiter = ServiceManager.GetService(PoWRewardLimiter);
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);

    let statusRsp: IClientFaucetStatus = {
      status: {
        walletBalance: ethWalletManager.getFaucetBalance()?.toString(),
        unclaimedBalance: rewardLimiter.getUnclaimedBalance().toString(),
        queuedBalance: ServiceManager.GetService(EthClaimManager).getQueuedAmount().toString(),
        balanceRestriction: rewardLimiter.getBalanceRestriction(),
      },
      outflowRestriction: ServiceManager.GetService(PoWOutflowLimiter).getOutflowDebugState(),
      refill: faucetConfig.ethRefillContract && faucetConfig.ethRefillContract.contract ? {
        balance: (await ethWalletManager.getWalletBalance(faucetConfig.ethRefillContract.contract)).toString(),
        trigger: faucetConfig.ethRefillContract.triggerBalance.toString(),
        amount: faucetConfig.ethRefillContract.requestAmount.toString(),
        cooldown: ServiceManager.GetService(EthWalletRefill).getFaucetRefillCooldown(),
      } : null,
      sessions: null,
      claims: null,
    };

    let sessions = PoWSession.getAllSessions();
    statusRsp.sessions = sessions.map((session) => {
      let activeClient = session.getActiveClient();
      let clientVersion = null;
      if(activeClient) {
        clientVersion = activeClient.getClientVersion();
      }

      let boostInfo = session.getBoostInfo();
      return {
        id: session.getSessionId(true),
        start: Math.floor(session.getStartTime().getTime() / 1000),
        idle: session.getIdleTime() ? Math.floor(session.getIdleTime().getTime() / 1000) : null,
        target: session.getTargetAddr(),
        ip: session.getLastRemoteIp(true),
        ipInfo: session.getLastIpInfo(),
        balance: session.getBalance().toString(),
        nonce: session.getLastNonce(),
        hashrate: session.getReportedHashRate(),
        status: session.getSessionStatus(),
        claimable: session.isClaimable(),
        restr: rewardLimiter.getSessionRestriction(session),
        cliver: clientVersion,
        boostF: boostInfo?.factor || 1,
        boostS: boostInfo?.score || 0,
      }
    });

    let queueStatus = this.buildQueueStatus();
    statusRsp.claims = queueStatus.claims;

    return statusRsp;
  }

  public getFaucetStatus(): Promise<IClientFaucetStatus> {
    if(this.faucetStatusPromise)
      return this.faucetStatusPromise;
    
    let now = Math.floor((new Date()).getTime() / 1000);
    if(this.cachedFaucetStatus && now - this.cachedFaucetStatus.time <= FAUCETSTATUS_CACHE_TIME)
      return Promise.resolve(this.cachedFaucetStatus.data);
    
    this.faucetStatusPromise = this.buildFaucetStatus();
    this.faucetStatusPromise.then((data) => {
      this.cachedFaucetStatus = {time: now, data: data};
      this.faucetStatusPromise = null;
    });
    return this.faucetStatusPromise;
  }

  private onGetFaucetStatus(remoteIp: string): Promise<IClientFaucetStatus> {
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Client requested faucet status (IP: " + remoteIp + ")");
    return this.getFaucetStatus();
  }

  private buildQueueStatus(): IClientQueueStatus {
    let claims = ServiceManager.GetService(EthClaimManager).getTransactionQueue();
    let rspClaims = claims.map((claimTx) => {
      return {
        time: Math.floor(claimTx.time.getTime() / 1000),
        session: getHashedSessionId(claimTx.session, faucetConfig.faucetSecret),
        target: claimTx.target,
        amount: claimTx.amount.toString(),
        status: claimTx.status,
        error: claimTx.failReason,
        nonce: claimTx.nonce || null,
        hash: claimTx.txhash || null,
        txhex: claimTx.txhex || null,
      }
    });

    return {
      claims: rspClaims,
    };
  }

  private onGetQueueStatus(): IClientQueueStatus {
    return this.buildQueueStatus();
  }

}
