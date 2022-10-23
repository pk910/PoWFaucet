import { IncomingMessage } from "http";
import { faucetConfig } from "../common/FaucetConfig";
import { PoWStatusLog, PoWStatusLogLevel } from "../common/PoWStatusLog";
import { ServiceManager } from "../common/ServiceManager";
import { ClaimTxStatus, EthWeb3Manager } from "../services/EthWeb3Manager";
import { FaucetStatus, IFaucetStatus } from "../services/FaucetStatus";
import { IIPInfo } from "../services/IPInfoResolver";
import { PoWRewardLimiter } from "../services/PoWRewardLimiter";
import { PoWClient } from "../websock/PoWClient";
import { PoWSession, PoWSessionStatus } from "../websock/PoWSession";
import { FaucetHttpResponse } from "./FaucetWebServer";
import * as crypto from "crypto";

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
}

export interface IClientFaucetStatus {
  status: {
    walletBalance: number;
    unclaimedBalance: number;
    refillBalance: number;
    balanceRestriction: number;
  };
  sessions: {
    id: string;
    start: number;
    idle: number;
    target: string;
    ip: string;
    ipInfo: IIPInfo;
    balance: number;
    nonce: number;
    hashrate: number;
    status: PoWSessionStatus;
    claimable: boolean;
    limit: number;
    cliver: string;
  }[];
  claims: {
    time: number;
    session: string;
    target: string;
    amount: number;
    status: ClaimTxStatus;
    error: string;
    nonce: number;
  }[];
}

export class FaucetWebApi {

  public onApiRequest(req: IncomingMessage): Promise<any> {
    return Promise.resolve().then(async () => {
      let apiUrl = this.parseApiUrl(req.url);
      if(!apiUrl || apiUrl.path.length === 0)
        return new FaucetHttpResponse(404, "Not Found");

      let res: any | Promise<any> = null;
      switch(apiUrl.path[0].toLowerCase()) {
        case "getMaxReward".toLowerCase(): 
          return this.onGetMaxReward();
        case "getFaucetConfig".toLowerCase(): 
          return this.onGetFaucetConfig(apiUrl.query['cliver'] as string);
        case "getFaucetStatus".toLowerCase(): 
          return await this.onGetFaucetStatus((req.headers['x-forwarded-for'] as string || req.socket.remoteAddress).split(", ")[0]);
      }

      return new FaucetHttpResponse(404, "Not Found");
    });
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
    let faucetHtml = faucetConfig.faucetHomeHtml || "";
    faucetHtml = faucetHtml.replace(/{faucetWallet}/, () => {
      return ServiceManager.GetService(EthWeb3Manager).getFaucetAddress();
    });
    return {
      faucetTitle: faucetConfig.faucetTitle,
      faucetStatus: faucetStatus.status,
      faucetStatusHash: faucetStatus.hash,
      faucetImage: faucetConfig.faucetImage,
      faucetHtml: faucetHtml,
      faucetCoinSymbol: faucetConfig.faucetCoinSymbol,
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
        p: faucetConfig.powScryptParams.paralellization,
        l: faucetConfig.powScryptParams.keyLength,
        d: faucetConfig.powScryptParams.difficulty,
      },
      powNonceCount: faucetConfig.powNonceCount,
      powHashrateLimit: faucetConfig.powHashrateSoftLimit,
      resolveEnsNames: !!faucetConfig.ensResolver,
      ethTxExplorerLink: faucetConfig.ethTxExplorerLink,
      time: Math.floor((new Date()).getTime() / 1000),
    };
  }

  private onGetFaucetConfig(clientVersion?: string): IClientFaucetConfig {
    return this.getFaucetConfig(null, clientVersion);
  }

  private getHashedIp(remoteAddr: string) {
    let ipMatch: RegExpExecArray;
    let hashParts: string[] = [];
    let hashGlue: string;
    let getHash = (input: string, len?: number) => {
      let hash = crypto.createHash("sha256");
      hash.update(faucetConfig.faucetSecret + "\r\n");
      hash.update("iphash\r\n");
      hash.update(input);
      let hashStr = hash.digest("hex");
      if(len)
        hashStr = hashStr.substring(0, len);
      return hashStr;
    };

    let hashBase = "";
    if((ipMatch = /^([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})\.([0-9]{1,3})$/.exec(remoteAddr))) {
      // IPv4
      hashGlue = ".";

      for(let i = 0; i < 4; i++) {
        hashParts.push(getHash(hashBase + ipMatch[i+1], 3));
        hashBase += (hashBase ? "." : "") + ipMatch[i+1];
      }
    }
    else {
      // IPv6
      hashGlue = ":";

      let ipSplit = remoteAddr.split(":");
      let ipParts: string[] = [];
      for(let i = 0; i < ipSplit.length; i++) {
        if(ipSplit[i] === "") {
          let skipLen = 8 - ipSplit.length + 1;
          for(let j = 0; j < skipLen; j++)
            ipParts.push("0");
          break;
        }
        ipParts.push(ipSplit[i]);
      }
      for(let i = 0; i < 8; i++) {
        hashParts.push(ipParts[i] === "0" ? "0" : getHash(hashBase + ipParts[i], 3));
        hashBase += (hashBase ? "." : "") + ipParts[i];
      }
    }

    return hashParts.join(hashGlue);
  }

  public async getFaucetStatus(): Promise<IClientFaucetStatus> {
    let rewardLimiter = ServiceManager.GetService(PoWRewardLimiter);
    let ethWeb3Manager = ServiceManager.GetService(EthWeb3Manager);

    let refillBalance: number = null;
    if(faucetConfig.ethRefillContract && faucetConfig.ethRefillContract.contract)
      refillBalance = await ethWeb3Manager.getWalletBalance(faucetConfig.ethRefillContract.contract);

    let statusRsp: IClientFaucetStatus = {
      status: {
        walletBalance: ethWeb3Manager.getFaucetBalance(),
        unclaimedBalance: rewardLimiter.getUnclaimedBalance(),
        refillBalance: refillBalance,
        balanceRestriction: rewardLimiter.getBalanceRestriction(),
      },
      sessions: null,
      claims: null,
    };

    let sessions = PoWSession.getAllSessions();
    statusRsp.sessions = sessions.map((session) => {
      let sessionIdHash = crypto.createHash("sha256");
      sessionIdHash.update(faucetConfig.faucetSecret + "\r\n");
      sessionIdHash.update(session.getSessionId());

      let activeClient = session.getActiveClient();
      let clientVersion = null;
      if(activeClient) {
        clientVersion = activeClient.getClientVersion();
      }

      return {
        id: sessionIdHash.digest("hex").substring(0, 20),
        start: Math.floor(session.getStartTime().getTime() / 1000),
        idle: session.getIdleTime() ? Math.floor(session.getIdleTime().getTime() / 1000) : null,
        target: session.getTargetAddr(),
        ip: this.getHashedIp(session.getLastRemoteIp()),
        ipInfo: session.getLastIpInfo(),
        balance: session.getBalance(),
        nonce: session.getLastNonce(),
        hashrate: session.getReportedHashRate(),
        status: session.getSessionStatus(),
        claimable: session.isClaimable(),
        limit: rewardLimiter.getSessionRestriction(session),
        cliver: clientVersion,
      }
    });

    let claims = ethWeb3Manager.getTransactionQueue();
    statusRsp.claims = claims.map((claimTx) => {
      let sessionIdHash = crypto.createHash("sha256");
      sessionIdHash.update(faucetConfig.faucetSecret + "\r\n");
      sessionIdHash.update(claimTx.session);

      return {
        time: Math.floor(claimTx.time.getTime() / 1000),
        session: sessionIdHash.digest("hex").substring(0, 20),
        target: claimTx.target,
        amount: claimTx.amount,
        status: claimTx.status,
        error: claimTx.failReason,
        nonce: claimTx.nonce || null,
      }
    });

    return statusRsp;
  }

  private onGetFaucetStatus(remoteIp: string): Promise<IClientFaucetStatus> {
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Client requested faucet status (IP: " + remoteIp + ")");
    return this.getFaucetStatus();
  }

}
