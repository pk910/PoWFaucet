import { WebSocket, RawData } from 'ws';
import * as crypto from "crypto";
import { faucetConfig } from '../common/FaucetConfig';
import { IPoWSessionRecoveryInfo, PoWSession, PoWSessionStatus } from './PoWSession';
import { AddressMark, FaucetStoreDB, SessionMark } from '../services/FaucetStoreDB';
import { renderTimespan } from '../utils/DateUtils';
import { isValidGuid } from '../utils/GuidUtils';
import { ClaimTx, ClaimTxEvents, EthWeb3Manager } from '../services/EthWeb3Manager';
import { ServiceManager } from '../common/ServiceManager';
import { PoWShareVerification } from './PoWShareVerification';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess';
import { FaucetStatus, IFaucetStatus } from '../services/FaucetStatus';
import { EnsWeb3Manager } from '../services/EnsWeb3Manager';
import { FaucetStatsLog } from '../services/FaucetStatsLog';
import { PoWRewardLimiter } from '../services/PoWRewardLimiter';
import { CaptchaVerifier } from '../services/CaptchaVerifier';
import { FaucetWebApi } from '../webserv/FaucetWebApi';
import { IIPInfo, IPInfoResolver } from '../services/IPInfoResolver';
import { PoWOutflowLimiter } from '../services/PoWOutflowLimiter';

interface PoWClientClaimTxSubscription {
  claimTx: ClaimTx;
  fns: {[key: string]: () => void};
}

export class PoWClient {
  private static activeClients: PoWClient[] = [];

  public static sendToAll(action: string, data?: any) {
    this.activeClients.forEach((client) => {
      try {
        client.sendMessage(action, data);
      } catch(ex) {}
    });
  }

  public static getAllClients(): PoWClient[] {
    return this.activeClients;
  }

  public static getClientCount(): number {
    return this.activeClients.length;
  }

  private socket: WebSocket;
  private remoteIp: string;
  private session: PoWSession = null;
  private pingTimer: NodeJS.Timer = null;
  private lastPingPong: Date;
  private statusHash: string;
  private clientVersion: string;
  private subscribedClaimTxs: PoWClientClaimTxSubscription[] = [];

  public constructor(socket: WebSocket, remoteIp: string) {
    this.socket = socket;
    if(remoteIp.match(/^::ffff:/))
      remoteIp = remoteIp.substring(7);
    this.remoteIp = remoteIp;
    this.lastPingPong = new Date();

    PoWClient.activeClients.push(this);

    this.socket.on("message", (data, isBinary) => this.onClientMessage(data, isBinary));
    this.socket.on("ping", (data) => {
      this.lastPingPong = new Date();
      if(this.socket)
        this.socket.pong(data)
    });
    this.socket.on("pong", (data) => {
      this.lastPingPong = new Date();
    });
    this.socket.on("error", (err) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "WebSocket error: " + err.toString());
      try {
        if(this.socket)
          this.socket.close();
      } catch(ex) {}
      this.dispose();
    });
    this.socket.on("close", () => {
      this.dispose();
    });
    this.pingClientLoop();
  }

  public getSession(): PoWSession {
    return this.session;
  }

  public setSession(session: PoWSession) {
    this.session = session;
    setTimeout(() => this.refreshFaucetStatus(), 100);
  }

  public getRemoteIP(): string {
    return this.remoteIp;
  }

  public getClientVersion(): string {
    return this.clientVersion;
  }

  private dispose() {
    this.socket = null;

    let clientIdx = PoWClient.activeClients.indexOf(this);
    if(clientIdx !== -1)
      PoWClient.activeClients.splice(clientIdx, 1);

    if(this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if(this.session)
      this.session.setActiveClient(null);

    if(this.subscribedClaimTxs.length > 0) {
      for(let i = 0; i < this.subscribedClaimTxs.length; i++) {
        this.unbindClaimTxEvents(this.subscribedClaimTxs[i]);
      }
    }
  }

  private killClient(reason?: string) {
    if(!this.socket)
      return;
    try {
      this.sendErrorResponse("CLIENT_KILLED", "Client killed: " + (reason || ""), null, FaucetLogLevel.HIDDEN);
      this.socket.close();
    } catch(ex) {}
    this.socket = null;
  }

  private pingClientLoop() {
    this.pingTimer = setInterval(() => {
      if(!this.socket)
        return;
      
      let pingpongTime = Math.floor(((new Date()).getTime() - this.lastPingPong.getTime()) / 1000);
      if(pingpongTime > faucetConfig.powPingTimeout) {
        this.killClient("ping timeout");
        return;
      }
      
      this.socket.ping();
    }, faucetConfig.powPingInterval * 1000);
  }

  public sendMessage(action: string, data?: any, rsp?: any) {
    if(!this.socket)
      return;
    
    let message: any = {
      action: action
    };
    if(data !== undefined)
      message.data = data;
    if(rsp !== undefined)
      message.rsp = rsp;
    
    this.socket.send(JSON.stringify(message));
  }

  private sendErrorResponse(errCode: string, errMessage: string, reqMsg?: any, logLevel?: FaucetLogLevel, data?: any) {
    if(!logLevel)
      logLevel = FaucetLogLevel.WARNING;
    let logReqMsg = reqMsg && logLevel !== FaucetLogLevel.INFO;
    ServiceManager.GetService(FaucetProcess).emitLog(logLevel, "Returned error to client: [" + errCode + "] " + errMessage + (logReqMsg ? "\n    Message: " + JSON.stringify(reqMsg) : ""));
    
    let resObj: any = {
      code: errCode,
      message: errMessage
    };
    if(data)
      resObj.data = data;
    this.sendMessage("error", resObj, reqMsg ? reqMsg.id : undefined);
  }

  public sendFaucetStatus(status: IFaucetStatus[], hash: string) {
    if(this.statusHash === hash)
      return;
    this.statusHash = hash;
    this.sendMessage("faucetStatus", status);
  }

  public refreshFaucetStatus() {
    let status = ServiceManager.GetService(FaucetStatus).getFaucetStatus(this.clientVersion, this.session);
    this.sendFaucetStatus(status.status, status.hash);
  }

  private onClientMessage(data: RawData, isBinary: boolean) {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch(ex) {
      this.killClient("invalid message: " + ex.toString());
      return;
    }
    if(!message || typeof message !== "object")
      return;

    switch(message.action) {
      case "getConfig":
        this.onCliGetConfig(message);
        break;
      case "startSession":
        this.onCliStartSession(message);
        break;
      case "resumeSession":
        this.onCliResumeSession(message);
        break;
      case "recoverSession":
        this.onCliRecoverSession(message);
        break;
      case "foundShare":
        this.onCliFoundShare(message);
        break;
      case "verifyResult":
        this.onCliVerifyResult(message);
        break;
      case "closeSession":
        this.onCliCloseSession(message);
        break;
      case "claimRewards":
        this.onCliClaimRewards(message);
        break;
      case "watchClaimTx":
        this.onCliWatchClaimTx(message);
        break;
      case "getClaimQueueState":
        this.onCliGetClaimQueueState(message);
        break;
      case "refreshBoost":
        this.onCliRefreshBoost(message);
        break;
      default:
        this.sendMessage("error", {
          code: "INVALID_ACTION",
          message: "Unknown action"
        }, message.id);
        break;
    }
  }

  private onCliGetConfig(message: any) {
    let reqId = message.id || undefined;
    if(message.data && message.data.version)
      this.clientVersion = message.data.version;

    let clientFaucetConfig = ServiceManager.GetService(FaucetWebApi).getFaucetConfig(this);
    this.statusHash = clientFaucetConfig.faucetStatusHash;

    this.sendMessage("config", clientFaucetConfig, reqId);
  }

  private async onCliStartSession(message: any) {
    let reqId = message.id || undefined;
    let sessionIdent = "";

    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", message);
    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_REQUEST", "Invalid request", message);

    if(faucetConfig.denyNewSessions) {
      let denyMessage = typeof faucetConfig.denyNewSessions === "string" ? faucetConfig.denyNewSessions : "The faucet is currently not allowing new sessions";
      return this.sendErrorResponse("FAUCET_DISABLED", denyMessage, message, FaucetLogLevel.INFO);
    }

    if(faucetConfig.captchas && faucetConfig.captchas.checkSessionStart) {
      if(!message.data.token)
        return this.sendErrorResponse("INVALID_CAPTCHA", "Captcha check required to start new session", message, FaucetLogLevel.INFO);
      let tokenValidity = await ServiceManager.GetService(CaptchaVerifier).verifyToken(message.data.token, this.remoteIp, "session");
      if(!tokenValidity)
        return this.sendErrorResponse("INVALID_CAPTCHA", "Captcha verification failed", message, FaucetLogLevel.INFO);
      if(typeof tokenValidity === "string")
        sessionIdent = tokenValidity;
    }

    if(faucetConfig.concurrentSessions > 0 && PoWSession.getConcurrentSessionCountByIp(this.remoteIp) >= faucetConfig.concurrentSessions)
      return this.sendErrorResponse("CONCURRENCY_LIMIT", "Only " + faucetConfig.concurrentSessions + " concurrent sessions allowed per IP", message, FaucetLogLevel.INFO);

    let targetAddr: string = message.data.addr;
    if(typeof targetAddr === "string" && targetAddr.match(/^[-a-zA-Z0-9@:%._\+~#=]{1,256}\.eth$/) && faucetConfig.ensResolver) {
      try {
        targetAddr = await ServiceManager.GetService(EnsWeb3Manager).resolveEnsName(targetAddr);
      } catch(ex) {
        return this.sendErrorResponse("INVALID_ENSNAME", "Could not resolve ENS Name '" + targetAddr + "': " + ex.toString(), message, FaucetLogLevel.INFO);
      }
    }

    if(typeof targetAddr !== "string" || !targetAddr.match(/^0x[0-9a-f]{40}$/i) || targetAddr.match(/^0x0{40}$/i))
      return this.sendErrorResponse("INVALID_ADDR", "Invalid target address: " + targetAddr, message, FaucetLogLevel.INFO);

    let addressMarks = ServiceManager.GetService(FaucetStoreDB).getAddressMarks(targetAddr);
    if(addressMarks.indexOf(AddressMark.USED) !== -1)
      return this.sendErrorResponse("INVALID_ADDR", "Cannot start session for " + targetAddr + " (please wait " + renderTimespan(faucetConfig.claimAddrCooldown) + " between requests)", message, FaucetLogLevel.INFO);
    else if(addressMarks.length > 0)
      return this.sendErrorResponse("INVALID_ADDR", "Cannot start session for " + targetAddr + " (" + addressMarks.join(",") + ")", message, FaucetLogLevel.INFO);
    
    if(faucetConfig.concurrentSessions > 0 && PoWSession.getConcurrentSessionCountByAddr(targetAddr) >= faucetConfig.concurrentSessions)
      return this.sendErrorResponse("CONCURRENCY_LIMIT", "Only " + faucetConfig.concurrentSessions + " concurrent sessions allowed per wallet address", message, FaucetLogLevel.INFO);
    
    if(typeof faucetConfig.claimAddrMaxBalance === "number") {
      let walletBalance: bigint;
      try {
        walletBalance = await ServiceManager.GetService(EthWeb3Manager).getWalletBalance(targetAddr);
      } catch(ex) {
        return this.sendErrorResponse("BALANCE_ERROR", "Could not get balance of Wallet " + targetAddr + ": " + ex.toString(), message);
      }
      if(walletBalance > faucetConfig.claimAddrMaxBalance)
        return this.sendErrorResponse("BALANCE_LIMIT", "You're already holding " + ServiceManager.GetService(EthWeb3Manager).readableAmount(walletBalance) + " in your wallet. Please give others a chance to get some funds too.", message, FaucetLogLevel.INFO);
    }

    if(faucetConfig.claimAddrDenyContract) {
      try {
        if(await ServiceManager.GetService(EthWeb3Manager).checkIsContract(targetAddr)) {
          return this.sendErrorResponse("INVALID_ADDR", "Cannot start session for " + targetAddr + " (address is a contract)", message, FaucetLogLevel.INFO);
        }
      } catch(ex) {
        return this.sendErrorResponse("BALANCE_ERROR", "Could not check contract status of wallet " + targetAddr + ": " + ex.toString(), message);
      }
    }

    let ipInfo: IIPInfo = null;
    if(faucetConfig.ipInfoRequired) {
      try {
        ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo(this.remoteIp);
        if(ipInfo.status !== "success")
          return this.sendErrorResponse("INVALID_IPINFO", "Error while checking your IP: " + ipInfo.status, message, FaucetLogLevel.INFO);
      } catch(ex) {
        return this.sendErrorResponse("INVALID_IPINFO", "Error while checking your IP. Please try again later.", message, FaucetLogLevel.INFO);
      }
    }
    
    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", message);
    ServiceManager.GetService(FaucetStoreDB).setAddressMark(targetAddr, AddressMark.USED);

    // create new session
    let session = new PoWSession(this, targetAddr);
    if(sessionIdent)
      session.setIdent(sessionIdent);
    if(ipInfo)
      session.setLastIpInfo(this.remoteIp, ipInfo);

    this.sendMessage("ok", {
      sessionId: session.getSessionId(),
      startTime: Math.floor(session.getStartTime().getTime() / 1000),
      preimage: session.getPreImage(),
      targetAddr: targetAddr,
      recovery: session.getSignedSession(),
    }, reqId);

    this.refreshBoostInfoAndNotify();
  }

  private onCliResumeSession(message: any) {
    let reqId = message.id || undefined;

    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", message);
    if(typeof message.data !== "object" || !message.data) 
      return this.sendErrorResponse("INVALID_REQUEST", "Invalid request", message);

    let sessionId: string = message.data.sessionId;
    let session: PoWSession;
    if(!isValidGuid(sessionId))
      return this.sendErrorResponse("INVALID_SESSIONID", "Invalid session id: " + sessionId, message);

    if(!(session = PoWSession.getSession(sessionId))) {
      if((session = PoWSession.getClosedSession(sessionId))) {
        let sessClaim: any = null;
        // check if closed session is claimable and return claim token if so
        if(session.isClaimable() && ServiceManager.GetService(FaucetStoreDB).getSessionMarks(session.getSessionId(), []).indexOf(SessionMark.CLAIMED) === -1) {
          sessClaim = {
            balance: session.getBalance().toString(),
            token: session.getSignedSession(),
          };
        }
        return this.sendErrorResponse("SESSION_CLOSED", "Session has been closed.", message, FaucetLogLevel.INFO, sessClaim);
      }
      else
        return this.sendErrorResponse("INVALID_SESSIONID", "Unknown session id: " + sessionId, message, FaucetLogLevel.INFO);
    }
    

    if(faucetConfig.concurrentSessions > 0 && PoWSession.getConcurrentSessionCountByIp(this.remoteIp, session) >= faucetConfig.concurrentSessions)
      return this.sendErrorResponse("CONCURRENCY_LIMIT", "Concurrent session limit reached", message, FaucetLogLevel.INFO);

    let client: PoWClient;
    if((client = session.getActiveClient())) {
      client.setSession(null);
      client.sendMessage("sessionKill", {
        level: "client",
        message: "session resumed from another client",
        token: null
      });
    }

    session.setActiveClient(this);
    this.session = session;
    this.sendMessage("ok", {
      lastNonce: session.getLastNonce(),
    }, reqId);

    this.refreshBoostInfoAndNotify();
  }

  private async onCliRecoverSession(message: any) {
    let reqId = message.id || undefined;

    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", message);
    if(typeof message.data !== "string" || !message.data)
      return this.sendErrorResponse("INVALID_REQUEST", "Invalid request", message);

    let sessionSplit = message.data.split("|", 2);
    let sessionStr = sessionSplit[0];

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.faucetSecret + "\r\n");
    sessionHash.update(sessionStr);

    if(!sessionStr || sessionSplit[1] !== sessionHash.digest('base64'))
      return this.sendErrorResponse("INVALID_DATA", "Invalid recovery data", message);

    let sessionInfo: IPoWSessionRecoveryInfo = JSON.parse(Buffer.from(sessionStr, 'base64').toString("utf8"));
    if(PoWSession.getSession(sessionInfo.id))
      return this.sendErrorResponse("DUPLICATE_SESSION", "Session does already exist and cannot be recovered", message);

    if(faucetConfig.concurrentSessions > 0 && PoWSession.getConcurrentSessionCountByIp(this.remoteIp) >= faucetConfig.concurrentSessions)
      return this.sendErrorResponse("CONCURRENCY_LIMIT", "Concurrent session limit reached", message, FaucetLogLevel.INFO);

    let now = Math.floor((new Date()).getTime() / 1000);
    if(faucetConfig.claimSessionTimeout && (now - sessionInfo.startTime) > faucetConfig.claimSessionTimeout)
      return this.sendErrorResponse("SESSION_TIMEOUT", "Session is too old to recover (timeout)", message);
    let sessionMarks = ServiceManager.GetService(FaucetStoreDB).getSessionMarks(sessionInfo.id, []);
    if(sessionMarks.length > 0)
      return this.sendErrorResponse("INVALID_SESSION", "Session cannot be recovered (" + sessionMarks.join(",") + ")", message);

    let ipInfo: IIPInfo = null;
    if(faucetConfig.ipInfoRequired) {
      try {
        ipInfo = await ServiceManager.GetService(IPInfoResolver).getIpInfo(this.remoteIp);
        if(ipInfo.status !== "success")
          return this.sendErrorResponse("INVALID_IPINFO", "Error while checking your IP: " + ipInfo.status, message, FaucetLogLevel.INFO);
      } catch(ex) {
        return this.sendErrorResponse("INVALID_IPINFO", "Error while checking your IP. Please try again later.", message, FaucetLogLevel.INFO);
      }
    }

    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", message);

    let session = new PoWSession(this, {
      id: sessionInfo.id,
      startTime: sessionInfo.startTime,
      targetAddr: sessionInfo.targetAddr,
      preimage: sessionInfo.preimage,
      balance: sessionInfo.balance,
      nonce: sessionInfo.nonce,
      ident: sessionInfo.ident,
    });
    if(ipInfo)
      session.setLastIpInfo(this.remoteIp, ipInfo);
    
    this.sendMessage("ok", null, reqId);

    this.refreshBoostInfoAndNotify();
  }

  private onCliFoundShare(message: any) {
    let reqId = message.id || undefined;

    if(!this.session)
      return this.sendErrorResponse("SESSION_NOT_FOUND", "No active session found", message);
    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_SHARE", "Invalid share data", message);
    
    let shareData: {
      nonces: number[];
      params: string;
      hashrate: number;
    } = message.data;

    let powParamsStr = faucetConfig.powScryptParams.cpuAndMemory +
      "|" + faucetConfig.powScryptParams.blockSize +
      "|" + faucetConfig.powScryptParams.parallelization +
      "|" + faucetConfig.powScryptParams.keyLength +
      "|" + faucetConfig.powScryptParams.difficulty;

    if(shareData.params !== powParamsStr) 
      return this.sendErrorResponse("INVALID_SHARE", "Invalid share params", message);
    if(shareData.nonces.length !== faucetConfig.powNonceCount)
      return this.sendErrorResponse("INVALID_SHARE", "Invalid nonce count", message);
    
    let lastNonce = this.session.getLastNonce();
    for(let i = 0; i < shareData.nonces.length; i++) {
      if(shareData.nonces[i] <= lastNonce)
        return this.sendErrorResponse("INVALID_SHARE", "Nonce too low", message);
      lastNonce = shareData.nonces[i];
    }
    this.session.setLastNonce(lastNonce);
    if(shareData.hashrate)
      this.session.reportHashRate(shareData.hashrate);
    this.session.resetMissedVerifications();
    
    if(faucetConfig.powHashrateHardLimit > 0) {
      let sessionAge = Math.floor(((new Date()).getTime() - this.session.getStartTime().getTime()) / 1000);
      let nonceLimit = (sessionAge + 30) * faucetConfig.powHashrateHardLimit;
      if(lastNonce > nonceLimit)
        return this.sendErrorResponse("HASHRATE_LIMIT", "Nonce too high (did you evade the hashrate limit?) " + sessionAge + "/" + nonceLimit, message);
    }

    let shareVerification = new PoWShareVerification(this.session, shareData.nonces);
    shareVerification.startVerification().then((result) => {
      if(!result.isValid)
        this.sendErrorResponse("WRONG_SHARE", "Share verification failed", message);
      else {
        if(reqId)
          this.sendMessage("ok", null, reqId);
        
        let faucetStats = ServiceManager.GetService(FaucetStatsLog);
        faucetStats.statShareCount++;
        faucetStats.statShareRewards += result.reward;
        faucetStats.statVerifyCount += shareVerification.getMinerVerifyCount();
        faucetStats.statVerifyMisses += shareVerification.getMinerVerifyMisses();
      }
    }, () => {
      if(this.session)
        this.sendErrorResponse("VERIFY_FAILED", "Share verification error", message);
    });
  }
  

  private onCliVerifyResult(message: any) {
    if(!this.session)
      return this.sendErrorResponse("SESSION_NOT_FOUND", "No active session found");
    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_VERIFYRESULT", "Invalid verification result data");

    let verifyRes: {
      shareId: string;
      isValid: boolean;
    } = message.data;

    let verifyValid = PoWShareVerification.processVerificationResult(verifyRes.shareId, this.session.getSessionId(), verifyRes.isValid);
    let verifyReward: bigint;
    if(verifyValid && this.session && (verifyReward = ServiceManager.GetService(PoWRewardLimiter).getVerificationReward(this.session)) > 0 && this.session) {
      this.session.addBalance(verifyReward);

      let faucetStats = ServiceManager.GetService(FaucetStatsLog);
      faucetStats.statVerifyReward += verifyReward;

      this.sendMessage("updateBalance", {
        balance: this.session.getBalance().toString(),
        recovery: this.session.getSignedSession(),
        reason: "valid verification"
      });
    }
  }

  private onCliCloseSession(message: any) {
    let reqId = message.id || undefined;

    if(!this.session) 
      return this.sendErrorResponse("SESSION_NOT_FOUND", "No active session found", message);

    let session = this.session;
    this.session.closeSession(true, true);

    let claimToken = session.isClaimable() ? session.getSignedSession() : null;
    this.sendMessage("ok", {
      claimable: session.isClaimable(),
      token: claimToken
    }, reqId);
  }

  private async onCliClaimRewards(message: any) {
    let reqId = message.id || undefined;

    if(typeof message.data !== "object" || !message.data || !message.data.token)
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (missing)", message);

    if(faucetConfig.captchas && faucetConfig.captchas.checkBalanceClaim) {
      if(!message.data.captcha) 
        return this.sendErrorResponse("INVALID_CAPTCHA", "Captcha check required to claim rewards", message, FaucetLogLevel.INFO);
      let tokenValidity = await ServiceManager.GetService(CaptchaVerifier).verifyToken(message.data.captcha, this.remoteIp, "claim");
      if(!tokenValidity)
        return this.sendErrorResponse("INVALID_CAPTCHA", "Captcha verification failed", message, FaucetLogLevel.INFO);
    }

    let sessionSplit = message.data.token.split("|", 2);
    let sessionStr = sessionSplit[0];

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.faucetSecret + "\r\n");
    sessionHash.update(sessionStr);

    if(!sessionStr || sessionSplit[1] !== sessionHash.digest('base64')) 
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (verification failed)", message);

    let sessionInfo: IPoWSessionRecoveryInfo = JSON.parse(Buffer.from(sessionStr, 'base64').toString("utf8"));
    if(!sessionInfo.claimable)
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (not claimable)", message);

    var startTime = new Date(sessionInfo.startTime * 1000);
    if(faucetConfig.claimSessionTimeout && ((new Date()).getTime() - startTime.getTime()) / 1000 > faucetConfig.claimSessionTimeout)
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (expired)", message);

    let sessionMarks = ServiceManager.GetService(FaucetStoreDB).getSessionMarks(sessionInfo.id, [SessionMark.CLOSED]);
    if(sessionMarks.length > 0) 
      return this.sendErrorResponse("INVALID_CLAIM", "Session is not allowed to claim (" + sessionMarks.join(",") + ")", message);

    ServiceManager.GetService(FaucetStoreDB).setSessionMark(sessionInfo.id, SessionMark.CLAIMED);

    let closedSession = PoWSession.getClosedSession(sessionInfo.id);
    if(closedSession)
      closedSession.setSessionStatus(PoWSessionStatus.CLAIMED);

    let claimTx = ServiceManager.GetService(EthWeb3Manager).addClaimTransaction(sessionInfo.targetAddr, BigInt(sessionInfo.balance), sessionInfo.id);
    claimTx.once("confirmed", () => {
      let faucetStats = ServiceManager.GetService(FaucetStatsLog);
      faucetStats.statClaimCount++;
      faucetStats.statClaimRewards += BigInt(sessionInfo.balance);

      // add paid tx fee to mined amount
      ServiceManager.GetService(PoWOutflowLimiter).addMinedAmount(claimTx.txfee);
    });
    this.bindClaimTxEvents(claimTx);
    this.sendMessage("ok", {
      queueIdx: claimTx.queueIdx
    }, reqId);
  }

  private onCliWatchClaimTx(message: any) {
    let reqId = message.id || undefined;
    if(typeof message.data !== "object" || !message.data || !message.data.sessionId)
      return this.sendErrorResponse("INVALID_WATCHCLAIM", "Invalid watch claim request", message);

    let claimTx = ServiceManager.GetService(EthWeb3Manager).getClaimTransaction(message.data.sessionId);
    if(!claimTx)
      return this.sendErrorResponse("CLAIM_NOT_FOUND", "Claim transaction not found in queue", message);
    
    this.bindClaimTxEvents(claimTx);
    this.sendMessage("ok", {
      queueIdx: claimTx.queueIdx
    }, reqId);
  }

  private bindClaimTxEvents(claimTx: ClaimTx) {
    for(let i = 0; i < this.subscribedClaimTxs.length; i++) {
      if(this.subscribedClaimTxs[i].claimTx === claimTx)
        return;
    }

    let subscription: PoWClientClaimTxSubscription = {
      claimTx: claimTx,
      fns: {
        "pending": () => {
          this.sendMessage("claimTx", {
            session: claimTx.session,
            status: "pending",
            txHash: claimTx.txhash
          });
        },
        "confirmed": () => {
          this.sendMessage("claimTx", {
            session: claimTx.session,
            status: "confirmed",
            txHash: claimTx.txhash,
            txBlock: claimTx.txblock
          });
          this.unbindClaimTxEvents(subscription);
        },
        "failed": () => {
          this.sendMessage("claimTx", {
            session: claimTx.session,
            status: "failed",
            error: claimTx.failReason
          });
          this.unbindClaimTxEvents(subscription);
        }
      }
    }
    this.subscribedClaimTxs.push(subscription);

    let events = Object.keys(subscription.fns);
    for(let i = 0; i < events.length; i++) {
      subscription.claimTx.on(events[i] as keyof ClaimTxEvents, subscription.fns[events[i]]);
    }
  }

  private unbindClaimTxEvents(subscription: PoWClientClaimTxSubscription) {
    let events = Object.keys(subscription.fns);
    for(let i = 0; i < events.length; i++) {
      subscription.claimTx.off(events[i] as keyof ClaimTxEvents, subscription.fns[events[i]]);
    }
    let subscriptionIdx = this.subscribedClaimTxs.indexOf(subscription);
    if(subscriptionIdx > -1) {
      this.subscribedClaimTxs.splice(subscriptionIdx, 1);
    }
  }

  private onCliRefreshBoost(message: any) {
    let reqId = message.id || undefined;
    if(!this.session)
      return this.sendErrorResponse("SESSION_NOT_FOUND", "No active session found", message);
    
    if(message.data && message.data.passport) {
      this.session.refreshBoostInfo(true, message.data.passport).then((boostInfo) => {
        this.sendMessage("ok", {
          boostInfo: boostInfo,
        }, reqId);
      }, (err) => {
        console.error(err);
        this.sendErrorResponse("BOOST_PASSPORT_INVALID", "Invalid Passport:\n" + err.toString(), message, FaucetLogLevel.HIDDEN);
      });
    }
    else {
      this.session.refreshBoostInfo(true).then((boostInfo) => {
        this.sendMessage("ok", {
          boostInfo: boostInfo,
          cooldown: this.session.getBoostRefreshCooldown(),
        }, reqId);
      }, (err) => {
        this.sendErrorResponse("BOOST_REFRESH_FAILED", "Refresh failed: " + err.toString(), message, null, {
          cooldown: this.session.getBoostRefreshCooldown(),
        });
      });
    }
  }

  private refreshBoostInfoAndNotify() {
    if(!this.session)
      return;
    this.session.refreshBoostInfo().then((boostInfo) => {
      this.sendMessage("boostInfo", boostInfo);
    });
  }

  private onCliGetClaimQueueState(message: any) {
    let reqId = message.id || undefined;
    this.sendMessage("ok", {
      lastIdx: ServiceManager.GetService(EthWeb3Manager).getLastProcessedClaimIdx(),
    }, reqId);
  }

}
