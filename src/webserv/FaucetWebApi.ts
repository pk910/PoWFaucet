import { IncomingMessage } from "http";
import { faucetConfig } from "../config/FaucetConfig";
import { ServiceManager } from "../common/ServiceManager";
import { EthWalletManager } from "../eth/EthWalletManager";
import { FaucetStatus, IFaucetStatus } from "../services/FaucetStatus";
import { FaucetHttpResponse } from "./FaucetHttpServer";
import { SessionManager } from "../session/SessionManager";
import { FaucetSession, FaucetSessionStatus, FaucetSessionStoreData, FaucetSessionTask, IClientSessionInfo } from "../session/FaucetSession";
import { ModuleHookAction, ModuleManager } from "../modules/ModuleManager";
import { IFaucetResultSharingConfig } from "../config/ConfigShared";
import { FaucetError } from "../common/FaucetError";
import { EthClaimInfo, EthClaimManager } from "../eth/EthClaimManager";
import { buildFaucetStatus, buildQueueStatus, buildSessionStatus } from "./api/faucetStatus";

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
  minClaim: number;
  maxClaim: number;
  sessionTimeout: number;
  ethTxExplorerLink: string;
  time: number;
  resultSharing: IFaucetResultSharingConfig;
  modules: {
    [module: string]: any;
  },
}

export interface IClientSessionStatus {
  session: string;
  status: string;
  start: number;
  tasks: FaucetSessionTask[];
  balance: string;
  target: string;
  claimIdx?: number;
  claimStatus?: string;
  claimBlock?: number;
  claimHash?: string;
  claimMessage?: string;
  failedCode?: string;
  failedReason?: string;
  details?: {
    data: any;
    claim: any;
  };
}


const FAUCETSTATUS_CACHE_TIME = 10;

export class FaucetWebApi {
  private apiEndpoints: {[endpoint: string]: (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => Promise<any>} = {};
  private cachedStatusData: {[key: string]: {
    time: number;
    data: any;
  }} = {};

  public async onApiRequest(req: IncomingMessage, body?: Buffer): Promise<any> {
    let apiUrl = this.parseApiUrl(req.url);
    if (!apiUrl || apiUrl.path.length === 0)
      return new FaucetHttpResponse(404, "Not Found");
    switch (apiUrl.path[0].toLowerCase()) {
      case "getVersion".toLowerCase():
        return this.onGetVersion();
      case "getMaxReward".toLowerCase():
        return this.onGetMaxReward();
      case "getFaucetConfig".toLowerCase():
        return this.onGetFaucetConfig(apiUrl.query['cliver'] as string, apiUrl.query['session'] as string);
      case "startSession".toLowerCase():
        return this.onStartSession(req, body);
      case "getSession".toLowerCase():
        return this.onGetSession(apiUrl.query['session'] as string);
      case "claimReward".toLowerCase():
        return this.onClaimReward(req, body);
      case "getSessionStatus".toLowerCase():
        return this.onGetSessionStatus(apiUrl.query['session'] as string, !!apiUrl.query['details']);
      case "getQueueStatus".toLowerCase():
        return this.onGetQueueStatus();
      case "getFaucetStatus".toLowerCase():
        return this.onGetFaucetStatus();
      default:
        let handler: (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => Promise<any>;
        if((handler = this.apiEndpoints[apiUrl.path[0].toLowerCase()]))
          return handler(req, apiUrl, body);
    }
    return new FaucetHttpResponse(404, "Not Found");
  }

  public registerApiEndpoint(endpoint: string, handler: (req: IncomingMessage, url: IFaucetApiUrl, body: Buffer) => Promise<any>) {
    this.apiEndpoints[endpoint.toLowerCase()] = handler;
  }

  public removeApiEndpoint(endpoint: string) {
    delete this.apiEndpoints[endpoint.toLowerCase()];
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

  private getRemoteAddr(req: IncomingMessage): string {
    let remoteAddr: string = null;
    if(req.headers['x-forwarded-for']) {
      let proxyChain = (req.headers['x-forwarded-for'] as string).split(", ");
      remoteAddr = proxyChain.pop();
    }
    if(!remoteAddr)
      remoteAddr = req.socket.remoteAddress;
    return remoteAddr;
  }

  private onGetVersion(): string {
    return faucetConfig.faucetVersion;
  }

  private onGetMaxReward(): number {
    return faucetConfig.maxDropAmount;
  }

  public getFaucetHomeHtml(): string {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let faucetHtml = faucetConfig.faucetHomeHtml || "";
    faucetHtml = faucetHtml.replace(/{faucetWallet}/, () => {
      return ethWalletManager.getFaucetAddress();
    });
    return faucetHtml;
  }

  public onGetFaucetConfig(clientVersion: string, sessionId: string): IClientFaucetConfig {
    let faucetSession = sessionId ? ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING, FaucetSessionStatus.CLAIMABLE]) : null;
    let faucetStatus = ServiceManager.GetService(FaucetStatus).getFaucetStatus(clientVersion, faucetSession);
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    
    let moduleConfig = {};
    ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.ClientConfig, [moduleConfig, sessionId]);

    return {
      faucetTitle: faucetConfig.faucetTitle,
      faucetStatus: faucetStatus.status,
      faucetStatusHash: faucetStatus.hash,
      faucetImage: faucetConfig.faucetImage,
      faucetHtml: this.getFaucetHomeHtml(),
      faucetCoinSymbol: faucetConfig.faucetCoinSymbol,
      faucetCoinType: faucetConfig.faucetCoinType,
      faucetCoinContract: faucetConfig.faucetCoinContract,
      faucetCoinDecimals: ethWalletManager.getFaucetDecimals(),
      minClaim: faucetConfig.minDropAmount,
      maxClaim: faucetConfig.maxDropAmount,
      sessionTimeout: faucetConfig.sessionTimeout,
      ethTxExplorerLink: faucetConfig.ethTxExplorerLink,
      time: Math.floor((new Date()).getTime() / 1000),
      resultSharing: faucetConfig.resultSharing,
      modules: moduleConfig,
    };
  }

  public async onStartSession(req: IncomingMessage, body: Buffer): Promise<any> {
    if(req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");
    
    let userInput = JSON.parse(body.toString("utf8"));
    let responseData: any = {};
    let sessionInfo: IClientSessionInfo;
    let session: FaucetSession;
    try {
      session = await ServiceManager.GetService(SessionManager).createSession(this.getRemoteAddr(req), userInput);
      if(session.getSessionStatus() === FaucetSessionStatus.FAILED) {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: session.getSessionData("failed.code"),
          failedReason: session.getSessionData("failed.reason"),
          balance: session.getDropAmount().toString(),
          target: session.getTargetAddr(),
        }
      }

      sessionInfo = await session.getSessionInfo();
    } catch(ex) {
      if(ex instanceof FaucetError) {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: ex.getCode(),
          failedReason: ex.message,
        }
      }
      else {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: "INTERNAL_ERROR",
          failedReason: ex.toString(),
        }
      }
    }
    
    return sessionInfo;
  }

  public async onGetSession(sessionId: string): Promise<any> {
    let session: FaucetSession;
    if(!sessionId || !(session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]))) {
      return {
        status: "unknown",
        error: "Session not found"
      };
    }

    let sessionInfo: IClientSessionInfo;
    try {
      sessionInfo = await session.getSessionInfo();
    } catch(ex) {
      if(ex instanceof FaucetError) {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: ex.getCode(),
          failedReason: ex.message,
        }
      }
      else {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: "INTERNAL_ERROR",
          failedReason: ex.toString(),
        }
      }
    }

    return sessionInfo;
  }

  public async onClaimReward(req: IncomingMessage, body: Buffer): Promise<any> {
    if(req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");
    
    let userInput = JSON.parse(body.toString("utf8"));
    let sessionData: FaucetSessionStoreData;
    if(!userInput || !userInput.session || !(sessionData = await ServiceManager.GetService(SessionManager).getSessionData(userInput.session))) {
      return {
        status: FaucetSessionStatus.FAILED,
        failedCode: "INVALID_SESSION",
        failedReason: "Session not found.",
      }
    }
    
    try {
      await ServiceManager.GetService(EthClaimManager).createSessionClaim(sessionData, userInput);
    } catch(ex) {
      if(ex instanceof FaucetError) {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: ex.getCode(),
          failedReason: ex.message,
        }
      }
      else {
        console.error(ex, ex.stack);
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: "INTERNAL_ERROR",
          failedReason: ex.toString(),
        }
      }
    }

    return this.getSessionStatus(sessionData, false);
  }

  private getSessionStatus(sessionData: FaucetSessionStoreData, details: boolean): IClientSessionStatus {
    let sessionStatus: IClientSessionStatus = {
      session: sessionData.sessionId,
      status: sessionData.status,
      start: sessionData.startTime,
      tasks: sessionData.tasks,
      balance: sessionData.dropAmount,
      target: sessionData.targetAddr,
    };
    if(sessionData.status === FaucetSessionStatus.FAILED) {
      sessionStatus.failedCode = sessionData.data ? sessionData.data['failed.code'] : null;
      sessionStatus.failedReason = sessionData.data ? sessionData.data['failed.reason'] : null;
    }
    if(sessionData.claim) {
      sessionStatus.claimIdx = sessionData.claim.claimIdx;
      sessionStatus.claimStatus = sessionData.claim.claimStatus;
      sessionStatus.claimBlock = sessionData.claim.txBlock;
      sessionStatus.claimHash = sessionData.claim.txHash;
      sessionStatus.claimMessage = sessionData.claim.txError;
    }
    if(details) {
      sessionStatus.details = {
        data: sessionData.data,
        claim: sessionData.claim,
      };
    }

    return sessionStatus;
  }

  public async onGetSessionStatus(sessionId: string, details: boolean): Promise<any> {
    let sessionData: FaucetSessionStoreData;
    if(!sessionId || !(sessionData = await ServiceManager.GetService(SessionManager).getSessionData(sessionId)))
      return new FaucetHttpResponse(404, "Session not found");
    
    return this.getSessionStatus(sessionData, details);
  }

  public async onGetQueueStatus(): Promise<any> {
    let now = Math.floor(new Date().getTime() / 1000);
    let cachedRsp, cacheKey = "queue";
    if(!(cachedRsp = this.cachedStatusData[cacheKey]) || cachedRsp.time < now - FAUCETSTATUS_CACHE_TIME) {
      cachedRsp = this.cachedStatusData[cacheKey] = {
        time: now,
        data: buildQueueStatus(),
      };
    }
    return cachedRsp.data;
  }

  public async onGetFaucetStatus(): Promise<any> {
    let now = Math.floor(new Date().getTime() / 1000);
    let cachedRsp, cacheKey = "faucet";
    if(!(cachedRsp = this.cachedStatusData[cacheKey]) || cachedRsp.time < now - FAUCETSTATUS_CACHE_TIME) {
      cachedRsp = this.cachedStatusData[cacheKey] = {
        time: now,
        data: Object.assign(
          await buildFaucetStatus(),
          buildQueueStatus(),
          await buildSessionStatus()
        ),
      };
    }
    return cachedRsp.data;  
  }



}
