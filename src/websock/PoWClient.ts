import { WebSocket, RawData } from 'ws';
import * as hcaptcha from "hcaptcha";
import * as crypto from "crypto";
import { faucetConfig } from '../common/FaucetConfig';
import { PoWSession, PoWSessionStatus } from './PoWSession';
import { AddressMark, FaucetStore, SessionMark } from '../services/FaucetStore';
import { renderTimespan } from '../utils/DateUtils';
import { isValidGuid } from '../utils/GuidUtils';
import { EthWeb3Manager } from '../services/EthWeb3Manager';
import { ServiceManager } from '../common/ServiceManager';
import { PoWShareVerification } from './PoWShareVerification';
import { PoWStatusLog, PoWStatusLogLevel } from '../common/PoWStatusLog';
import { weiToEth } from '../utils/ConvertHelpers';

export class PoWClient {
  private socket: WebSocket;
  private remoteIp: string;
  private session: PoWSession = null;
  private pingTimer: NodeJS.Timer = null;
  private lastPingPong: Date;

  public constructor(socket: WebSocket, remoteIp: string) {
    this.socket = socket;
    this.remoteIp = remoteIp;
    this.lastPingPong = new Date();

    this.socket.on("message", (data, isBinary) => this.onClientMessage(data, isBinary));
    this.socket.on("ping", (data) => {
      this.lastPingPong = new Date();
      this.socket.pong(data)
    });
    this.socket.on("pong", (data) => {
      this.lastPingPong = new Date();
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
  }

  public getRemoteIP(): string {
    return this.remoteIp;
  }

  private dispose() {
    this.socket = null;
    if(this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if(this.session)
      this.session.setActiveClient(null);
  }

  private killClient(reason?: string) {
    if(!this.socket)
      return;
    try {
      this.sendErrorResponse("CLIENT_KILLED", "Client killed: " + (reason || ""));
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

  private sendErrorResponse(errCode: string, errMessage: string, reqId?: any) {
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.WARNING, "Returned error to client: [" + errCode + "] " + errMessage);
    this.sendMessage("error", {
      code: errCode,
      message: errMessage
    }, reqId);
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
      case "getFaucetStatus":
        this.onCliGetFaucetStatus(message);
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
    this.sendMessage("config", {
      faucetTitle: faucetConfig.faucetTitle,
      faucetImage: faucetConfig.faucetImage,
      hcapSiteKey: faucetConfig.hcaptcha ? faucetConfig.hcaptcha.siteKey : null,
      hcapSession: faucetConfig.hcaptcha && faucetConfig.hcaptcha.checkSessionStart,
      hcapClaim: faucetConfig.hcaptcha && faucetConfig.hcaptcha.checkBalanceClaim,
      shareReward: faucetConfig.powShareReward,
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
    }, reqId);
  }

  private async onCliStartSession(message: any) {
    let reqId = message.id || undefined;

    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", reqId);
    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_REQUEST", "Invalid request", reqId);

    if(faucetConfig.hcaptcha && faucetConfig.hcaptcha.checkSessionStart) {
      if(!message.data.token)
        return this.sendErrorResponse("INVALID_HCAPTCHA", "HCaptcha token required to start new session", reqId);
      let hcaptchaResponse = await hcaptcha.verify(faucetConfig.hcaptcha.secret, message.data.token, this.remoteIp, faucetConfig.hcaptcha.siteKey);
      if(!hcaptchaResponse.success)
        return this.sendErrorResponse("INVALID_HCAPTCHA", "HCaptcha verification failed", reqId);
    }

    let targetAddr: string = message.data.addr;
    // todo: resolve ens?


    if(typeof targetAddr !== "string" || !targetAddr.match(/^0x[0-9a-f]{40}$/i))
      return this.sendErrorResponse("INVALID_ADDR", "Invalid target address: " + targetAddr, reqId);

    let addressMarks = ServiceManager.GetService(FaucetStore).getAddressMarks(targetAddr);
    if(addressMarks.indexOf(AddressMark.USED) !== -1)
      return this.sendErrorResponse("INVALID_ADDR", "Cannot start session for " + targetAddr + " (please wait " + renderTimespan(faucetConfig.claimAddrCooldown) + " between requests)", reqId);
    else if(addressMarks.length > 0)
      return this.sendErrorResponse("INVALID_ADDR", "Cannot start session for " + targetAddr + " (" + addressMarks.join(",") + ")", reqId);
    
    ServiceManager.GetService(FaucetStore).setAddressMark(targetAddr, AddressMark.USED);

    // create new session
    let session = new PoWSession(this, targetAddr);

    this.sendMessage("ok", {
      sessionId: session.getSessionId(),
      startTime: Math.floor(session.getStartTime().getTime() / 1000),
      preimage: session.getPreImage(),
      targetAddr: targetAddr,
      recovery: session.getSignedSession(),
    }, reqId);
  }

  private onCliResumeSession(message: any) {
    let reqId = message.id || undefined;

    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", reqId);
    if(typeof message.data !== "object" || !message.data) 
      return this.sendErrorResponse("INVALID_REQUEST", "Invalid request", reqId);

    let sessionId: string = message.data.sessionId;
    let session: PoWSession;
    if(!isValidGuid(sessionId) || !(session = PoWSession.getSession(sessionId)))
      return this.sendErrorResponse("INVALID_SESSIONID", "Invalid session id: " + sessionId, reqId);

    let client: PoWClient;
    if((client = session.getActiveClient())) {
      client.setSession(null);
      client.sendMessage("sessionKill", {
        level: "client",
        message: "session resumed from another client"
      });
    }

    session.setActiveClient(this);
    this.session = session;
    this.sendMessage("ok", {
      lastNonce: session.getLastNonce(),
    }, reqId);
  }

  private onCliRecoverSession(message: any) {
    let reqId = message.id || undefined;

    if(this.session)
      return this.sendErrorResponse("INVALID_REQUEST", "Duplicate Session", reqId);
    if(typeof message.data !== "string" || !message.data)
      return this.sendErrorResponse("INVALID_REQUEST", "Invalid request", reqId);

    let sessionSplit = message.data.split("|", 2);
    let sessionStr = sessionSplit[0];

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.powSessionSecret + "\r\n");
    sessionHash.update(sessionStr);

    if(!sessionStr || sessionSplit[1] !== sessionHash.digest('base64'))
      return this.sendErrorResponse("INVALID_DATA", "Invalid recovery data", reqId);

    let sessionInfo = JSON.parse(Buffer.from(sessionStr, 'base64').toString("utf8"));
    if(PoWSession.getSession(sessionInfo.id))
      return this.sendErrorResponse("DUPLICATE_SESSION", "Session does already exist and cannot be recovered", reqId);

    var startTime = new Date(sessionInfo.startTime * 1000);
    if(faucetConfig.powSessionTimeout && ((new Date()).getTime() - startTime.getTime()) / 1000 > faucetConfig.powSessionTimeout)
      return this.sendErrorResponse("SESSION_TIMEOUT", "Session is too old to recover (timeout)", reqId);

    let sessionMarks = ServiceManager.GetService(FaucetStore).getSessionMarks(sessionInfo.id, []);
    if(sessionMarks.length > 0)
      return this.sendErrorResponse("INVALID_SESSION", "Session cannot be recovered (" + sessionMarks.join(",") + ")", reqId);

    let session = new PoWSession(this, sessionInfo.targetAddr, {
      id: sessionInfo.id,
      startTime: startTime,
      preimage: sessionInfo.preimage,
      balance: sessionInfo.balance,
      nonce: sessionInfo.nonce,
    });
    this.sendMessage("ok", null, reqId);
  }

  private onCliFoundShare(message: any) {
    let reqId = message.id || undefined;

    if(!this.session)
      return this.sendErrorResponse("SESSION_NOT_FOUND", "No active session found", reqId);
    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_SHARE", "Invalid share data", reqId);
    
    let shareData: {
      nonces: number[];
      params: string;
      hashrate: number;
    } = message.data;

    let powParamsStr = faucetConfig.powScryptParams.cpuAndMemory +
      "|" + faucetConfig.powScryptParams.blockSize +
      "|" + faucetConfig.powScryptParams.paralellization +
      "|" + faucetConfig.powScryptParams.keyLength +
      "|" + faucetConfig.powScryptParams.difficulty;

    if(shareData.params !== powParamsStr) 
      return this.sendErrorResponse("INVALID_SHARE", "Invalid share params", reqId);
    if(shareData.nonces.length !== faucetConfig.powNonceCount)
      return this.sendErrorResponse("INVALID_SHARE", "Invalid nonce count", reqId);
    
    let lastNonce = this.session.getLastNonce();
    for(let i = 0; i < shareData.nonces.length; i++) {
      if(shareData.nonces[i] <= lastNonce)
        return this.sendErrorResponse("INVALID_SHARE", "Nonce too low", reqId);
      lastNonce = shareData.nonces[i];
    }
    this.session.setLastNonce(lastNonce);
    if(shareData.hashrate)
      this.session.reportHashRate(shareData.hashrate);
    
    let shareVerification = new PoWShareVerification(this.session, shareData.nonces);
    shareVerification.startVerification().then((isValid) => {
      if(!isValid)
        this.sendErrorResponse("WRONG_SHARE", "Share verification failed", reqId);
      else {
        if(reqId)
          this.sendMessage("ok", null, reqId);
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Valid share for session " + this.session.getSessionId() + " (verify: " + shareVerification.getVerificationType() + ")");
      }
    }, () => {
      this.sendErrorResponse("VERIFY_FAILED", "Share verification error", reqId);
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

    PoWShareVerification.processVerificationResult(verifyRes.shareId, this.session.getSessionId(), verifyRes.isValid);
  }

  private onCliCloseSession(message: any) {
    let reqId = message.id || undefined;

    if(!this.session) 
      return this.sendErrorResponse("SESSION_NOT_FOUND", "No active session found", reqId);

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
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (missing)", reqId);

    if(faucetConfig.hcaptcha && faucetConfig.hcaptcha.checkBalanceClaim) {
      if(!message.data.captcha) 
        return this.sendErrorResponse("INVALID_CAPTCHA", "HCaptcha token required to claim rewards", reqId);
      let hcaptchaResponse = await hcaptcha.verify(faucetConfig.hcaptcha.secret, message.data.captcha, this.remoteIp, faucetConfig.hcaptcha.siteKey);
      if(!hcaptchaResponse.success) 
        return this.sendErrorResponse("INVALID_HCAPTCHA", "HCaptcha verification failed", reqId);
    }

    let sessionSplit = message.data.token.split("|", 2);
    let sessionStr = sessionSplit[0];

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.powSessionSecret + "\r\n");
    sessionHash.update(sessionStr);

    if(!sessionStr || sessionSplit[1] !== sessionHash.digest('base64')) 
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (verification failed)", reqId);

    let sessionInfo = JSON.parse(Buffer.from(sessionStr, 'base64').toString("utf8"));
    if(!sessionInfo.claimable)
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (not claimable)", reqId);

    var startTime = new Date(sessionInfo.startTime * 1000);
    if(faucetConfig.claimSessionTimeout && ((new Date()).getTime() - startTime.getTime()) / 1000 > faucetConfig.claimSessionTimeout)
      return this.sendErrorResponse("INVALID_CLAIM", "Invalid claim token (expired)", reqId);

    let sessionMarks = ServiceManager.GetService(FaucetStore).getSessionMarks(sessionInfo.id, [SessionMark.CLOSED]);
    if(sessionMarks.length > 0) 
      return this.sendErrorResponse("INVALID_CLAIM", "Session is not allowed to claim (" + sessionMarks.join(",") + ")", reqId);

    ServiceManager.GetService(FaucetStore).setSessionMark(sessionInfo.id, SessionMark.CLAIMED);

    let closedSession = PoWSession.getClosedSession(sessionInfo.id);
    if(closedSession)
      closedSession.setSessionStatus(PoWSessionStatus.CLAIMED);

    let claimTx = ServiceManager.GetService(EthWeb3Manager).addClaimTransaction(sessionInfo.targetAddr, sessionInfo.balance);
    this.sendMessage("ok", null, reqId);
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Claimed reward for session " + sessionInfo.id + " to " + sessionInfo.targetAddr + " (" + (Math.round(weiToEth(sessionInfo.balance)*1000)/1000) + " ETH)");

    claimTx.once("confirmed", () => {
      this.sendMessage("claimTx", {
        session: sessionInfo.id,
        txHash: claimTx.txhash,
        txBlock: claimTx.txblock
      });
    });
    claimTx.once("failed", () => {
      this.sendMessage("claimTx", {
        session: sessionInfo.id,
        error: claimTx.failReason
      });
    });
  }

  private async onCliGetFaucetStatus(message: any) {
    let reqId = message.id || undefined;
    let statusRsp: any = {};

    let sessions = PoWSession.getAllSessions();
    statusRsp.sessions = sessions.map((session) => {
      let sessionIdHash = crypto.createHash("sha256");
      sessionIdHash.update(faucetConfig.powSessionSecret + "\r\n");
      sessionIdHash.update(session.getSessionId());

      let sessionIpHash: string = null;
      if(session.getActiveClient()) {
        let reoteIpHash = crypto.createHash("sha256");
        reoteIpHash.update(faucetConfig.powSessionSecret + "\r\n");
        reoteIpHash.update(session.getActiveClient().getRemoteIP());
        sessionIpHash = reoteIpHash.digest("hex").substring(0, 20);
      }

      return {
        id: sessionIdHash.digest("hex").substring(0, 20),
        start: Math.floor(session.getStartTime().getTime() / 1000),
        idle: session.getIdleTime() ? Math.floor(session.getIdleTime().getTime() / 1000) : null,
        target: session.getTargetAddr(),
        ip: sessionIpHash,
        balance: session.getBalance(),
        nonce: session.getLastNonce(),
        hashrate: session.getReportedHashRate(),
        status: session.getSessionStatus(),
        claimable: session.isClaimable(),
      }
    });

    let claims = ServiceManager.GetService(EthWeb3Manager).getTransactionQueue();
    statusRsp.claims = claims.map((claimTx) => {
      return {
        time: Math.floor(claimTx.time.getTime() / 1000),
        target: claimTx.target,
        amount: claimTx.amount,
        status: claimTx.status,
        nonce: claimTx.nonce || null,
      }
    });

    this.sendMessage("ok", statusRsp, reqId);
  }

}
