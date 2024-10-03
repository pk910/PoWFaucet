import { IncomingMessage } from "http";

import { FaucetError } from "../common/FaucetError.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { faucetConfig } from "../config/FaucetConfig.js";
import { EthClaimManager } from "../eth/EthClaimManager.js";
import { EthWalletManager } from "../eth/EthWalletManager.js";
import { GitcoinClaimer } from "../modules/gitcoin-claimer/GitcoinClaimer.js";
import { ModuleHookAction, ModuleManager } from "../modules/ModuleManager.js";
import { RecurringLimitsModule } from "../modules/recurring-limits/RecurringLimitsModule";
import { FaucetStatus, IFaucetStatus } from "../services/FaucetStatus.js";
import { PromMetricsService } from "../services/PromMetrics.js";
import {
  FaucetSession,
  FaucetSessionStatus,
  FaucetSessionStoreData,
  FaucetSessionTask,
  IClientSessionInfo,
} from "../session/FaucetSession.js";
import { SessionManager } from "../session/SessionManager.js";
import { sha256 } from "../utils/CryptoUtils.js";
import { nowSeconds } from "../utils/DateUtils.js";
import {
  buildFaucetStatus,
  buildQueueStatus,
  buildSessionStatus,
} from "./api/faucetStatus.js";
import { FaucetHttpResponse } from "./FaucetHttpServer.js";

export interface IFaucetApiUrl {
  path: string[];
  query: { [key: string]: string | boolean };
}

export interface IClientFaucetConfig {
  faucetStatus: IFaucetStatus[];
  faucetStatusHash: string;
  faucetCoinSymbol: string;
  faucetCoinType: string;
  faucetCoinContract: string;
  faucetCoinDecimals: number;
  faucetCoinBalance: string | null;
  noFundsBalance: number;
  lowFundsBalance: number;
  minClaim: number;
  maxClaim: number;
  sessionTimeout: number;
  ethTxExplorerLink: string;
  ethWalletAddr: string;
  time: number;
  modules: {
    [module: string]: any;
  };
  gitcoinMinimumScore?: number;
  gitcoinClaimerEnabled?: boolean;
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
  private apiEndpoints: {
    [endpoint: string]: (
      req: IncomingMessage,
      url: IFaucetApiUrl,
      body: Buffer
    ) => Promise<any>;
  } = {};
  private cachedStatusData: {
    [key: string]: {
      time: number;
      data: any;
    };
  } = {};

  public async onApiRequest(req: IncomingMessage, body?: Buffer): Promise<any> {
    const apiUrl = this.parseApiUrl(req.url);
    if (!apiUrl || apiUrl.path.length === 0)
      return new FaucetHttpResponse(404, "Not Found");

    // k8s health check
    if (apiUrl.path[0].toLowerCase() === "health") {
      if (req.method !== "GET")
        return new FaucetHttpResponse(405, "Method Not Allowed");

      switch (apiUrl.path[1].toLowerCase()) {
        case "readyz":
          return this.onReadinessCheck();
        case "livez":
          return this.onLivenessCheck();
        default:
          return new FaucetHttpResponse(404, "Not Found");
      }
    }

    const endpoint = apiUrl.path[0];
    const apiKey = process.env.CLIENT_API_KEY;

    if (!apiKey) {
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.ERROR,
        `CLIENT_API_KEY is missing`
      );
      return new FaucetHttpResponse(403, "Access denied");
    }

    const requestApiKey = req.headers["api-key"];

    if (requestApiKey !== apiKey) {
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.WARNING,
        `Unauthorized request to "${endpoint}"`
      );
      return new FaucetHttpResponse(403, "Access denied");
    }

    switch (endpoint.toLowerCase()) {
      case "getVersion".toLowerCase():
        return this.onGetVersion();
      case "getMaxReward".toLowerCase():
        return this.onGetMaxReward();
      case "getFaucetConfig".toLowerCase(): {
        return this.onGetFaucetConfig(
          apiUrl.query["cliver"] as string,
          apiUrl.query["session"] as string
        );
      }
      case "startSession".toLowerCase():
        return this.onStartSession(req, body);
      case "getSession".toLowerCase():
        return this.onGetSession(apiUrl.query["session"] as string);
      case "claimReward".toLowerCase():
        return this.onClaimReward(req, body);
      case "getSessionStatus".toLowerCase():
        return this.onGetSessionStatus(
          apiUrl.query["session"] as string,
          !!apiUrl.query["details"]
        );
      case "getQueueStatus".toLowerCase():
        return this.onGetQueueStatus();
      case "getFaucetStatus".toLowerCase():
        return this.onGetFaucetStatus(apiUrl.query["key"] as string);
      case "getUserLimit".toLowerCase():
        return this.onCheckUserLimits(req, apiUrl.query["userId"] as string);
      case "getAddressScore".toLowerCase():
        return this.onGetAddressScore(req, body);
      case "getSingingMessage".toLowerCase():
        return this.getSingingMessage(req, body);
      case "passportSubmitData".toLowerCase():
        return this.onPassportSubmitData(req, body);
      case "checkPassportSubmitCache".toLowerCase():
        return this.onCheckPassportSubmitCache(req, body);
      case "claimRewardByGitcoin".toLowerCase():
        return this.onClaimRewardByGitcoin(
          req,
          body,
          apiUrl.query["userId"] as string
        );
      default:
        let handler: (
          req: IncomingMessage,
          url: IFaucetApiUrl,
          body: Buffer
        ) => Promise<any>;
        if ((handler = this.apiEndpoints[apiUrl.path[0].toLowerCase()]))
          return handler(req, apiUrl, body);
    }
    return new FaucetHttpResponse(404, "Not Found");
  }

  private async onPassportSubmitData(
    req: IncomingMessage,
    body: Buffer
  ): Promise<
    | {
        canSubmitAgainAt: number;
      }
    | FaucetHttpResponse
  > {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    const GitcoinClaimerService = ServiceManager.GetService(GitcoinClaimer);
    return GitcoinClaimerService.submitPassport(body);
  }

  private async onCheckPassportSubmitCache(
    req: IncomingMessage,
    body: Buffer
  ): Promise<
    | {
        canSubmitAgainAt: number;
      }
    | FaucetHttpResponse
  > {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    const GitcoinClaimerService = ServiceManager.GetService(GitcoinClaimer);
    return GitcoinClaimerService.checkPassportSubmitCache(body);
  }

  private async getSingingMessage(
    req: IncomingMessage,
    body: Buffer
  ): Promise<any> {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    const GitcoinClaimerService = ServiceManager.GetService(GitcoinClaimer);
    return GitcoinClaimerService.getSingingMessage();
  }

  private async onGetAddressScore(
    req: IncomingMessage,
    body: Buffer
  ): Promise<
    | FaucetHttpResponse
    | {
        value: number;
        needToSubmit: boolean;
      }
  > {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    const GitcoinClaimerService = ServiceManager.GetService(GitcoinClaimer);
    return GitcoinClaimerService.getAddressScore(body);
  }

  public registerApiEndpoint(
    endpoint: string,
    handler: (
      req: IncomingMessage,
      url: IFaucetApiUrl,
      body: Buffer
    ) => Promise<any>
  ) {
    this.apiEndpoints[endpoint.toLowerCase()] = handler;
  }

  public removeApiEndpoint(endpoint: string) {
    delete this.apiEndpoints[endpoint.toLowerCase()];
  }

  private parseApiUrl(url: string): IFaucetApiUrl {
    let urlMatch = /\/api\/([^?]+)(?:\?(.*))?/.exec(url);
    if (!urlMatch) return null;
    let urlRes: IFaucetApiUrl = {
      path: urlMatch[1] && urlMatch[1].length > 0 ? urlMatch[1].split("/") : [],
      query: {},
    };
    if (urlMatch[2] && urlMatch[2].length > 0) {
      urlMatch[2].split("&").forEach((query) => {
        let parts = query.split("=", 2);
        urlRes.query[parts[0]] = parts.length == 1 ? true : parts[1];
      });
    }
    return urlRes;
  }

  public getRemoteAddr(req: IncomingMessage): string {
    let remoteAddr: string = null;
    if (faucetConfig.httpProxyCount > 0 && req.headers["x-forwarded-for"]) {
      let proxyChain = (req.headers["x-forwarded-for"] as string).split(", ");
      let clientIpIdx = proxyChain.length - faucetConfig.httpProxyCount;
      if (clientIpIdx < 0) clientIpIdx = 0;
      remoteAddr = proxyChain[clientIpIdx];
    }
    if (!remoteAddr) {
      remoteAddr = req.socket.remoteAddress;
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        `[getRemoteAddr] remoteAddr taken from socket: ${remoteAddr}`
      );
    }

    return remoteAddr;
  }

  private onGetVersion(): string {
    return faucetConfig.faucetVersion;
  }

  private onGetMaxReward(): number {
    return faucetConfig.maxDropAmount;
  }

  public async onGetFaucetConfig(
    clientVersion?: string,
    sessionId?: string
  ): Promise<IClientFaucetConfig> {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    // await ethWalletManager.updateFaucetStatus();

    let faucetSession = sessionId
      ? ServiceManager.GetService(SessionManager).getSession(sessionId, [
          FaucetSessionStatus.RUNNING,
          FaucetSessionStatus.CLAIMABLE,
        ])
      : null;
    let faucetStatus = ServiceManager.GetService(FaucetStatus).getFaucetStatus(
      clientVersion,
      faucetSession
    );

    let moduleConfig = {};
    ServiceManager.GetService(ModuleManager).processActionHooks(
      [],
      ModuleHookAction.ClientConfig,
      [moduleConfig, sessionId]
    );

    const config: IClientFaucetConfig = {
      faucetStatus: faucetStatus.status,
      faucetStatusHash: faucetStatus.hash,
      faucetCoinSymbol: faucetConfig.faucetCoinSymbol,
      faucetCoinType: faucetConfig.faucetCoinType,
      faucetCoinContract: faucetConfig.faucetCoinContract,
      faucetCoinDecimals: ethWalletManager.getFaucetDecimals(),
      faucetCoinBalance: String(ethWalletManager.walletState.balance),
      noFundsBalance: faucetConfig.noFundsBalance,
      lowFundsBalance: faucetConfig.lowFundsBalance,
      minClaim: faucetConfig.minDropAmount,
      maxClaim: faucetConfig.maxDropAmount,
      sessionTimeout: faucetConfig.sessionTimeout,
      ethTxExplorerLink: faucetConfig.ethTxExplorerLink,
      ethWalletAddr: faucetConfig.ethWalletAddr,
      gitcoinMinimumScore: faucetConfig.gitcoinMinimumScore,
      gitcoinClaimerEnabled: faucetConfig.gitcoinClaimerEnabled,
      time: nowSeconds(),
      modules: moduleConfig,
    };

    return config;
  }

  public async onStartSession(
    req: IncomingMessage,
    body: Buffer
  ): Promise<any> {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    const userInput = JSON.parse(body.toString("utf8"));
    if (!userInput.userId) {
      return new FaucetHttpResponse(500, "userId is missing");
    }
    let sessionInfo: IClientSessionInfo;
    let session: FaucetSession;
    try {
      session = await ServiceManager.GetService(SessionManager).createSession(
        this.getRemoteAddr(req),
        userInput
      );
      if (session.getSessionStatus() === FaucetSessionStatus.FAILED) {
        let failedCode = session.getSessionData("failed.code");
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.INFO,
          `[FaucetWebApi.onStartSession]: Session status failed: ${failedCode}; UserId: ${userInput.userId}`
        );

        return {
          status: FaucetSessionStatus.FAILED,
          failedCode,
          failedReason: session.getSessionData("failed.reason"),
          balance: session.getDropAmount().toString(),
          target: session.getTargetAddr(),
        };
      }

      sessionInfo = await session.getSessionInfo();
    } catch (ex) {
      if (ex instanceof FaucetError) {
        let failedCode = ex.getCode();
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.INFO,
          `[FaucetWebApi.onStartSession]: Failed getting session info: ${failedCode}; UserId: ${userInput.userId}`
        );

        return {
          status: FaucetSessionStatus.FAILED,
          failedCode,
          failedReason: ex.message,
        };
      } else {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: "INTERNAL_ERROR",
          failedReason: ex.toString(),
        };
      }
    }

    return sessionInfo;
  }

  public async onCheckUserLimits(
    req: IncomingMessage,
    userId: string
  ): Promise<any> {
    if (req.method !== "GET")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    if (!userId) {
      return new FaucetHttpResponse(500, "userId is missing");
    }

    const remoteIP = this.getRemoteAddr(req);
    const moduleManager = ServiceManager.GetService(ModuleManager);
    const recurringLimitsModule =
      moduleManager.getModule<RecurringLimitsModule>("recurring-limits");
    const time = await recurringLimitsModule?.getTimeToNewSessionStart(
      userId,
      remoteIP
    );

    return time
      ? {
          allowed: false,
          canBeStartedAt: time,
        }
      : {
          allowed: true,
        };
  }

  public async onGetSession(sessionId: string): Promise<any> {
    let session: FaucetSession;
    if (
      !sessionId ||
      !(session = ServiceManager.GetService(SessionManager).getSession(
        sessionId,
        [FaucetSessionStatus.RUNNING]
      ))
    ) {
      return {
        status: "unknown",
        error: "Session not found",
      };
    }

    let sessionInfo: IClientSessionInfo;
    try {
      sessionInfo = await session.getSessionInfo();
    } catch (ex) {
      if (ex instanceof FaucetError) {
        let failedCode = ex.getCode();
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.INFO,
          `[FaucetWebApi.onGetSession]: Failed getting session info: ${failedCode}; sessionId: ${sessionId}`
        );
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode,
          failedReason: ex.message,
        };
      } else {
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: "INTERNAL_ERROR",
          failedReason: ex.toString(),
        };
      }
    }

    return sessionInfo;
  }

  private async onClaimRewardByGitcoin(
    req: IncomingMessage,
    body: Buffer,
    userId: string
  ): Promise<
    | {
        txHash: string;
      }
    | FaucetHttpResponse
  > {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    const remoteIP = this.getRemoteAddr(req);
    const gitcoinClaimer = ServiceManager.GetService(GitcoinClaimer);
    const canClaim = await gitcoinClaimer.checkIfUserCanClaimGitcoin(
      userId,
      remoteIP
    );
    // If user can't claim, throw an error
    if (!canClaim.can) {
      return new FaucetHttpResponse(403, canClaim.reason);
    }

    try {
      const { txHash, targetAddress } = await gitcoinClaimer.claimGitcoin(
        body,
        userId,
        remoteIP
      );
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        `[GITCOIN_CLAIM_SUCCESS]: User: ${userId}; Address: ${targetAddress};`
      );
      return { txHash };
    } catch (ex) {
      let failedReason = ex.toString();
      ServiceManager.GetService(FaucetProcess).emitLog(
        FaucetLogLevel.INFO,
        `[FaucetWebApi.onClaimRewardByGitcoin]: Error. UserId: ${userId}; Reason: ${failedReason};`
      );
      throw ex;
    }
  }

  public async onClaimReward(req: IncomingMessage, body: Buffer): Promise<any> {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    let userInput = JSON.parse(body.toString("utf8"));
    let sessionData: FaucetSessionStoreData;
    if (
      !userInput ||
      !userInput.session ||
      !(sessionData = await ServiceManager.GetService(
        SessionManager
      ).getSessionData(userInput.session))
    ) {
      return {
        status: FaucetSessionStatus.FAILED,
        failedCode: "INVALID_SESSION",
        failedReason: "Session not found.",
      };
    }

    try {
      await ServiceManager.GetService(EthClaimManager).createSessionClaim(
        sessionData,
        userInput
      );
    } catch (ex) {
      if (ex instanceof FaucetError) {
        let failedCode = ex.getCode();
        ServiceManager.GetService(FaucetProcess).emitLog(
          FaucetLogLevel.INFO,
          `[FaucetWebApi.onClaimReward]: Got FaucetError: ${failedCode}; UserId: ${userInput.userId}`
        );

        return {
          status: FaucetSessionStatus.FAILED,
          failedCode,
          failedReason: ex.message,
        };
      } else {
        console.error(ex, ex.stack);
        return {
          status: FaucetSessionStatus.FAILED,
          failedCode: "INTERNAL_ERROR",
          failedReason: ex.toString(),
        };
      }
    }

    return this.getSessionStatus(sessionData, false);
  }

  private getSessionStatus(
    sessionData: FaucetSessionStoreData,
    details: boolean
  ): IClientSessionStatus {
    let sessionStatus: IClientSessionStatus = {
      session: sessionData.sessionId,
      status: sessionData.status,
      start: sessionData.startTime,
      tasks: sessionData.tasks,
      balance: sessionData.dropAmount,
      target: sessionData.targetAddr,
    };
    if (sessionData.status === FaucetSessionStatus.FAILED) {
      sessionStatus.failedCode = sessionData.data
        ? sessionData.data["failed.code"]
        : null;
      sessionStatus.failedReason = sessionData.data
        ? sessionData.data["failed.reason"]
        : null;
    }
    if (sessionData.claim) {
      sessionStatus.claimIdx = sessionData.claim.claimIdx;
      sessionStatus.claimStatus = sessionData.claim.claimStatus;
      sessionStatus.claimBlock = sessionData.claim.txBlock;
      sessionStatus.claimHash = sessionData.claim.txHash;
      sessionStatus.claimMessage = sessionData.claim.txError;
    }
    if (details) {
      sessionStatus.details = {
        data: sessionData.data,
        claim: sessionData.claim,
      };
    }

    return sessionStatus;
  }

  public async onGetSessionStatus(
    sessionId: string,
    details: boolean
  ): Promise<any> {
    let sessionData: FaucetSessionStoreData;
    if (
      !sessionId ||
      !(sessionData = await ServiceManager.GetService(
        SessionManager
      ).getSessionData(sessionId))
    )
      return new FaucetHttpResponse(404, "Session not found");

    return this.getSessionStatus(sessionData, details);
  }

  public async onGetQueueStatus(): Promise<any> {
    let now = nowSeconds();
    let cachedRsp,
      cacheKey = "queue";
    if (
      !(cachedRsp = this.cachedStatusData[cacheKey]) ||
      cachedRsp.time < now - FAUCETSTATUS_CACHE_TIME
    ) {
      cachedRsp = this.cachedStatusData[cacheKey] = {
        time: now,
        data: buildQueueStatus(),
      };
    }
    return cachedRsp.data;
  }

  public async onGetFaucetStatus(key: string): Promise<any> {
    if (key) {
      if (key !== sha256(faucetConfig.faucetSecret + "-unmasked"))
        return new FaucetHttpResponse(403, "Access denied");
      return Object.assign(
        await buildFaucetStatus(),
        buildQueueStatus(true),
        await buildSessionStatus(true)
      );
    }

    let now = nowSeconds();
    let cachedRsp,
      cacheKey = "faucet";
    if (
      !(cachedRsp = this.cachedStatusData[cacheKey]) ||
      cachedRsp.time < now - FAUCETSTATUS_CACHE_TIME
    ) {
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

  public async onMetricsRequest(req: IncomingMessage): Promise<any> {
    if (req.method !== "GET")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    const auth = req.headers.authorization;

    if (!auth) {
      return new FaucetHttpResponse(403, "Access denied");
    }

    const [type, token] = auth.split(" ");

    if (
      type.toLowerCase() !== "bearer" ||
      !token ||
      token === "" ||
      token !== process.env.PROMETHEUS_AUTH_TOKEN
    ) {
      return new FaucetHttpResponse(403, "Access denied");
    }

    const metrics = await ServiceManager.GetService(
      PromMetricsService
    ).getWalletBalanceMetric();
    const contentType =
      ServiceManager.GetService(PromMetricsService).getContentType();

    return { contentType, metrics };
  }

  private async onReadinessCheck(): Promise<any> {
    if (!faucetConfig) {
      return new FaucetHttpResponse(500, "Not ready yet");
    }

    return new FaucetHttpResponse(200, "OK");
  }

  private async onLivenessCheck(): Promise<any> {
    return new FaucetHttpResponse(200, "OK");
  }
}
