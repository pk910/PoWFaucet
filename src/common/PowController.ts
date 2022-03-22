import { WebSocket, RawData } from 'ws';
import * as hcaptcha from "hcaptcha";
import * as crypto from "crypto";
import { faucetConfig } from './FaucetConfig';
import { getNewGuid, isValidGuid } from '../utils/GuidUtils';
import { PoWValidator } from './PoWValidator';
import { ClaimTx, EthWeb3Manager } from './EthWeb3Manager';
import { PoWStatusLog, PoWStatusLogLevel } from './PoWStatusLog';
import { weiToEth } from '../utils/ConvertHelpers';
import { AddressMark, FaucetStore, SessionMark } from './FaucetStore';
import { renderTimespan } from '../utils/DateUtils';

interface IPowClient {
  socket: WebSocket;
  remoteIp: string;
  session: string;
  pingTimer: NodeJS.Timer;
  lastPingPong: Date;
  pendingTx: {[id: string]: ClaimTx};
}

interface IPowSession {
  id: string;
  startTime: Date;
  idleTime: Date | null;
  targetAddr: string;
  preimage: string;
  balance: number;
  claimable: boolean;
  activeClient: IPowClient;
  lastNonce: number;
}

export interface IPowShare {
  shareId: string;
  session: string;
  nonces: number[];
  verifyLocal: boolean;
  verifyMinerCount: number;
  verifyMinerSessions: string[];
  verifyMinerResults: {[sessionId: string]: boolean};
  verifyMinerTimer: NodeJS.Timeout;
  isInvalid: boolean;
}

enum PoWSlashReason {
  MISSED_VERIFICATION = "missed_verify",
  INVALID_VERIFICATION = "invalid_verify",
  INVALID_SHARE = "invalid_share",
}

export class PowController {
  private ethWeb3Manager: EthWeb3Manager;
  private faucetStore: FaucetStore;
  private activeSessions: {[id: string]: IPowSession};
  private verifyingShares: {[id: string]: IPowShare};
  private powValidator: PoWValidator;
  private powParamsStr: string;
  
  public constructor(ethWeb3Manager: EthWeb3Manager, faucetStore: FaucetStore) {
    this.ethWeb3Manager = ethWeb3Manager;
    this.faucetStore = faucetStore;
    this.activeSessions = {};
    this.verifyingShares = {};
    this.powValidator = new PoWValidator();
    this.powParamsStr = faucetConfig.powScryptParams.cpuAndMemory +
      "|" + faucetConfig.powScryptParams.blockSize +
      "|" + faucetConfig.powScryptParams.paralellization +
      "|" + faucetConfig.powScryptParams.keyLength +
      "|" + faucetConfig.powScryptParams.difficulty;
  }

  public addClientSocket(socket: WebSocket, remoteIp: string) {
    let client: IPowClient = {
      socket,
      remoteIp,
      session: null,
      pingTimer: null,
      lastPingPong: new Date(),
      pendingTx: {}
    };

    socket.on("message", (data, isBinary) => this.onClientMessage(client, data, isBinary));
    socket.on("ping", (data) => {
      client.lastPingPong = new Date();
      socket.pong(data)
    });
    socket.on("pong", (data) => {
      client.lastPingPong = new Date();
    });
    socket.on("close", () => {
      client.socket = null;
      if(client.pingTimer) {
        clearInterval(client.pingTimer);
        client.pingTimer = null;
      }
      let session: IPowSession;
      if(client.session && (session = this.activeSessions[client.session]) && session.activeClient === client)
        session.activeClient = null;
    });
    this.pingClientLoop(client);
  }

  private killClient(client: IPowClient, reason?: string) {
    if(!client.socket)
      return;
    try {
      client.socket.close(1, reason);
    } catch(ex) {}
    client.socket = null;
  }

  private slashBadSession(sessionId: string, reason: PoWSlashReason) {
    let session = this.activeSessions[sessionId];
    if(!session)
      return;

    let penalty: string = null;
    switch(reason) {
      case PoWSlashReason.MISSED_VERIFICATION:
        let balancePenalty = this.applyBalancePenalty(session, faucetConfig.verifyMinerMissPenalty);
        penalty = "-" + (Math.round(weiToEth(balancePenalty)*1000)/1000) + "eth";
        break;
      case PoWSlashReason.INVALID_SHARE:
      case PoWSlashReason.INVALID_VERIFICATION:
        this.applyKillPenalty(session, reason);
        penalty = "killed";
        break;
    }

    PoWStatusLog.get().emitLog(PoWStatusLogLevel.WARNING, "Slash Session " + sessionId + " (reason: " + reason + ", penalty: " + penalty + ")");
  }

  private applyBalancePenalty(session: IPowSession, penalty: number): number {
    if(session.balance < penalty) {
      penalty = session.balance;
      session.balance = 0;
    }
    else
      session.balance -= penalty;
    
    this.sendToClient(session.activeClient, "updateBalance", {
      balance: session.balance,
      recovery: this.getSignedSession(session),
      reason: "verify miss (penalty: " + penalty + ")"
    });

    return penalty;
  }

  private applyKillPenalty(session: IPowSession, reason: PoWSlashReason) {
    this.faucetStore.setSessionMark(session.id, SessionMark.KILLED);
    delete this.activeSessions[session.id];
    if(session.activeClient) {
      this.sendToClient(session.activeClient, "sessionKill", reason);
      session.activeClient.session = null;
      session.activeClient = null;
    }
  }

  private pingClientLoop(client: IPowClient) {
    client.pingTimer = setInterval(() => {
      if(!client.socket)
        return;
      
      let pingpongTime = Math.floor(((new Date()).getTime() - client.lastPingPong.getTime()) / 1000);
      if(pingpongTime > faucetConfig.powPingTimeout) {
        this.killClient(client, "ping timeout");
        return;
      }
      
      client.socket.ping();
    }, faucetConfig.powPingInterval * 1000);
  }

  private sendToClient(client: IPowClient, action: string, data?: any, rsp?: any) {
    if(!client || !client.socket)
      return;
    
    let message: any = {
      action: action
    };
    if(data !== undefined)
      message.data = data;
    if(rsp !== undefined)
      message.rsp = rsp;
    
    client.socket.send(JSON.stringify(message));
  }

  private startSession(client: IPowClient, targetAddr: string, sessionId?: string): IPowSession {
    if(!sessionId)
      sessionId = getNewGuid();
    let session: IPowSession = {
      id: sessionId,
      startTime: new Date(),
      idleTime: null,
      targetAddr: targetAddr,
      preimage: crypto.randomBytes(8).toString('base64'),
      balance: 0,
      claimable: false,
      activeClient: client,
      lastNonce: 0,
    };
    client.session = sessionId;
    this.activeSessions[sessionId] = session;
    return session;
  }

  private getSignedSession(session: IPowSession) {
    let sessionDict = {
      id: session.id,
      startTime: Math.floor(session.startTime.getTime() / 1000),
      targetAddr: session.targetAddr,
      preimage: session.preimage,
      balance: session.balance,
      claimable: session.claimable,
    };
    let sessionStr = Buffer.from(JSON.stringify(sessionDict)).toString('base64');

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.powSessionSecret + "\r\n");
    sessionHash.update(sessionStr);

    return sessionStr + "|" + sessionHash.digest('base64');
  }

  private onClientMessage(client: IPowClient, data: RawData, isBinary: boolean) {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch(ex) {
      this.killClient(client, "invalid message: " + ex.toString());
      return;
    }
    if(!message || typeof message !== "object")
      return;

    switch(message.action) {
      case "getConfig":
        this.onCliGetConfig(client, message);
        break;
      case "startSession":
        this.onCliStartSession(client, message);
        break;
      case "resumeSession":
        this.onCliResumeSession(client, message);
        break;
      case "recoverSession":
        this.onCliRecoverSession(client, message);
        break;
      case "foundShare":
        this.onCliFoundShare(client, message);
        break;
      case "verifyResult":
        this.onCliVerifyResult(client, message);
        break;
      case "closeSession":
        this.onCliCloseSession(client, message);
        break;
      case "claimRewards":
        this.onCliClaimRewards(client, message);
        break;
      default:
        this.sendToClient(client, "error", {
          code: "INVALID_ACTION",
          message: "Unknown action"
        }, message.id);
        break;
    }
  }

  private onCliGetConfig(client: IPowClient, message: any) {
    let reqId = message.id || undefined;
    this.sendToClient(client, "config", {
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

  private async onCliStartSession(client: IPowClient, message: any) {
    let reqId = message.id || undefined;

    if(client.session) {
      this.sendToClient(client, "error", {
        code: "INVALID_REQUEST",
        message: "Duplicate Session"
      }, reqId);
      return;
    }

    if(typeof message.data !== "object" || !message.data) {
      this.sendToClient(client, "error", {
        code: "INVALID_REQUEST",
        message: "Invalid request"
      }, reqId);
      return;
    }

    if(faucetConfig.hcaptcha && faucetConfig.hcaptcha.checkSessionStart) {
      if(!message.data.token) {
        this.sendToClient(client, "error", {
          code: "NEED_HCAPTCHA",
          message: "HCaptcha token required to start new session"
        }, reqId);
        return;
      }
      let hcaptchaResponse = await hcaptcha.verify(faucetConfig.hcaptcha.secret, message.data.token, client.remoteIp, faucetConfig.hcaptcha.siteKey);
      if(!hcaptchaResponse.success) {
        this.sendToClient(client, "error", {
          code: "INVALID_HCAPTCHA",
          message: "HCaptcha verification failed"
        }, reqId);
        return;
      }
    }

    let targetAddr: string = message.data.addr;
    // todo: resolve ens?


    if(typeof targetAddr !== "string" || !targetAddr.match(/^0x[0-9a-f]{40}$/i)) {
      this.sendToClient(client, "error", {
        code: "INVALID_ADDR",
        message: "Invalid target address: " + targetAddr
      }, reqId);
      return;
    }

    let addressMarks = this.faucetStore.getAddressMarks(targetAddr);
    if(addressMarks.indexOf(AddressMark.USED) !== -1) {
      this.sendToClient(client, "error", {
        code: "INVALID_ADDR",
        message: "Cannot start session for " + targetAddr + " (please wait " + renderTimespan(faucetConfig.claimAddrCooldown) + " between requests)"
      }, reqId);
      return;
    }
    else if(addressMarks.length > 0) {
      this.sendToClient(client, "error", {
        code: "INVALID_ADDR",
        message: "Cannot start session for " + targetAddr + " (" + addressMarks.join(",") + ")"
      }, reqId);
      return;
    }
    this.faucetStore.setAddressMark(targetAddr, AddressMark.USED);

    // create new session
    let session = this.startSession(client, targetAddr);

    this.sendToClient(client, "ok", {
      sessionId: session.id,
      startTime: Math.floor(session.startTime.getTime() / 1000),
      preimage: session.preimage,
      targetAddr: targetAddr,
      recovery: this.getSignedSession(session),
    }, reqId);
  }

  private onCliResumeSession(client: IPowClient, message: any) {
    let reqId = message.id || undefined;

    if(client.session) {
      this.sendToClient(client, "error", {
        code: "INVALID_REQUEST",
        message: "Duplicate Session"
      }, reqId);
      return;
    }

    if(typeof message.data !== "object" || !message.data) {
      this.sendToClient(client, "error", {
        code: "INVALID_REQUEST",
        message: "Invalid request"
      }, reqId);
      return;
    }

    let sessionId: string = message.data.sessionId;
    if(!isValidGuid(sessionId) || !this.activeSessions.hasOwnProperty(sessionId)) {
      this.sendToClient(client, "error", {
        code: "INVALID_SESSIONID",
        message: "Invalid session id: " + sessionId
      }, reqId);
      return;
    }

    let session = this.activeSessions[sessionId];
    if(session.activeClient)
      this.killClient(session.activeClient, "session resumed from another client");
    
    session.activeClient = client;
    client.session = session.id;
    this.sendToClient(client, "ok", {
      lastNonce: session.lastNonce,
    }, reqId);
  }

  private onCliRecoverSession(client: IPowClient, message: any) {
    let reqId = message.id || undefined;

    if(client.session) {
      this.sendToClient(client, "error", {
        code: "INVALID_REQUEST",
        message: "Duplicate Session"
      }, reqId);
      return;
    }

    if(typeof message.data !== "string" || !message.data) {
      this.sendToClient(client, "error", {
        code: "INVALID_REQUEST",
        message: "Invalid request"
      }, reqId);
      return;
    }

    let sessionSplit = message.data.split("|", 2);
    let sessionStr = sessionSplit[0];

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.powSessionSecret + "\r\n");
    sessionHash.update(sessionStr);

    if(!sessionStr || sessionSplit[1] !== sessionHash.digest('base64')) {
      this.sendToClient(client, "error", {
        code: "INVALID_DATA",
        message: "Invalid recovery data"
      }, reqId);
      return;
    }

    let sessionInfo = JSON.parse(Buffer.from(sessionStr, 'base64').toString("utf8"));
    if(this.activeSessions.hasOwnProperty(sessionInfo.id)) {
      this.sendToClient(client, "error", {
        code: "DUPLICATE_SESSION",
        message: "Session does already exist and cannot be recovered"
      }, reqId);
      return;
    }

    var startTime = new Date(sessionInfo.startTime * 1000);
    if(faucetConfig.powSessionTimeout && ((new Date()).getTime() - startTime.getTime()) / 1000 > faucetConfig.powSessionTimeout) {
      this.sendToClient(client, "error", {
        code: "SESSION_TIMEOUT",
        message: "Session is too old to recover (timeout)"
      }, reqId);
      return;
    }

    let sessionMarks = this.faucetStore.getSessionMarks(sessionInfo.id, []);
    if(sessionMarks.length > 0) {
      this.sendToClient(client, "error", {
        code: "INVALID_SESSION",
        message: "Session cannot be recovered (" + sessionMarks.join(",") + ")"
      }, reqId);
      return;
    }

    let session = this.startSession(client, sessionInfo.targetAddr, sessionInfo.id);
    session.startTime = startTime;
    session.preimage = sessionInfo.preimage;
    session.balance = sessionInfo.balance;

    this.sendToClient(client, "ok", null, reqId);
  }

  private onCliFoundShare(client: IPowClient, message: any) {
    if(!client.session || !this.activeSessions[client.session]) {
      this.sendToClient(client, "error", {
        code: "SESSION_NOT_FOUND",
        message: "No active session found"
      });
      return;
    }
    let session = this.activeSessions[client.session];

    if(typeof message.data !== "object" || !message.data) {
      this.sendToClient(client, "error", {
        code: "INVALID_SHARE",
        message: "Invalid share data"
      });
      return;
    }

    let shareData: {
      nonces: number[];
      params: string;
    } = message.data;

    if(shareData.params !== this.powParamsStr) {
      this.sendToClient(client, "error", {
        code: "INVALID_SHARE",
        message: "Invalid share params"
      });
      return;
    }

    if(shareData.nonces.length !== faucetConfig.powNonceCount) {
      this.sendToClient(client, "error", {
        code: "INVALID_SHARE",
        message: "Invalid nonce count"
      });
      return;
    }
    let lastNonce = session.lastNonce;
    for(let i = 0; i < shareData.nonces.length; i++) {
      if(shareData.nonces[i] <= lastNonce) {
        this.sendToClient(client, "error", {
          code: "INVALID_SHARE",
          message: "Nonce too low"
        });
        return;
      }
      lastNonce = shareData.nonces[i];
    }
    session.lastNonce = lastNonce;
    
    let share: IPowShare = {
      shareId: getNewGuid(),
      session: client.session,
      nonces: shareData.nonces,
      verifyLocal: false,
      verifyMinerCount: 0,
      verifyMinerSessions: [],
      verifyMinerResults: {},
      verifyMinerTimer: null,
      isInvalid: false,
    };
    this.verifyingShares[share.shareId] = share;

    // verify share
    let validatorSessions = Object.keys(this.activeSessions).filter((sessionId) => {
      return (!!this.activeSessions[sessionId].activeClient && sessionId !== client.session && this.activeSessions[sessionId].balance > faucetConfig.verifyMinerMissPenalty);
    });
    let verifyLocalPercent = faucetConfig.verifyLocalPercent;
    if(validatorSessions.length < faucetConfig.verifyMinerPeerCount && faucetConfig.verifyLocalLowPeerPercent > verifyLocalPercent)
      verifyLocalPercent = faucetConfig.verifyLocalLowPeerPercent;

    share.verifyLocal = (Math.round(Math.random() * 100) < verifyLocalPercent);
    if(share.verifyLocal && this.powValidator.getValidationQueueLength() >= faucetConfig.verifyLocalMaxQueue)
      share.verifyLocal = false;

    if(share.verifyLocal) {
      // verify locally
      console.log("share " + share.shareId + ": validate locally");
      this.powValidator.validateShare(share, session.preimage).then((isValid) => {
        if(!isValid)
          share.isInvalid = true;
        this.processShareVerification(share);
      });
    }
    else if(faucetConfig.verifyMinerPercent > 0 && validatorSessions.length >= faucetConfig.verifyMinerPeerCount && (Math.round(Math.random() * 100) < faucetConfig.verifyMinerPercent)) {
      // redistribute to validators for verification
      share.verifyMinerCount = faucetConfig.verifyMinerIndividuals;
      console.log("share " + share.shareId + ": validate via miners");
      for(let i = 0; i < share.verifyMinerCount; i++) {
        let randSessIdx = Math.floor(Math.random() * validatorSessions.length);
        let validatorSessId = validatorSessions.splice(randSessIdx, 1)[0];
        share.verifyMinerSessions.push(validatorSessId);

        let validatorSess = this.activeSessions[validatorSessId];
        this.sendToClient(validatorSess.activeClient, "verify", {
          shareId: share.shareId,
          preimage: session.preimage,
          nonces: share.nonces,
        });
      }
      share.verifyMinerTimer = setTimeout(() => {
        share.verifyMinerTimer = null;
        this.processShareVerification(share);
      }, 15 * 1000);
    }
    else {
      // no verification - just accept
      console.log("share " + share.shareId + ": no validation");
      this.processShareVerification(share);
    }
  }

  private processShareVerification(share: IPowShare) {
    if(share.verifyMinerTimer) {
      clearTimeout(share.verifyMinerTimer);
    }
    if(!this.activeSessions[share.session]) {
      delete this.verifyingShares[share.shareId];
      return;
    }

    if(share.isInvalid && !share.verifyLocal) {
      // always verify invalid shares locally
      share.verifyLocal = true;
      this.powValidator.validateShare(share, this.activeSessions[share.session].preimage).then((isValid) => {
        if(isValid)
          share.isInvalid = false;
        this.processShareVerification(share);
      });
      return;
    }

    delete this.verifyingShares[share.shareId];

    if(share.verifyMinerSessions.length > 0 && faucetConfig.verifyMinerMissPenalty > 0) {
      // penalty for missed verification requests
      share.verifyMinerSessions.forEach((verifierId) => {
        this.slashBadSession(verifierId, PoWSlashReason.MISSED_VERIFICATION);
      });
    }
    
    Object.keys(share.verifyMinerResults).forEach((verifierId) => {
      if(share.verifyMinerResults[verifierId] !== !share.isInvalid) {
        this.slashBadSession(verifierId, PoWSlashReason.INVALID_VERIFICATION);
      }
    });

    if(share.isInvalid) {
      this.slashBadSession(share.session, PoWSlashReason.INVALID_SHARE);
    }
    else {
      // valid share - add rewards
      let session = this.activeSessions[share.session];
      session.balance += faucetConfig.powShareReward;

      this.sendToClient(session.activeClient, "updateBalance", {
        balance: session.balance,
        recovery: this.getSignedSession(session),
        reason: "valid share"
      });
    }
  }

  private onCliVerifyResult(client: IPowClient, message: any) {
    if(!client.session || !this.activeSessions[client.session]) {
      this.sendToClient(client, "error", {
        code: "SESSION_NOT_FOUND",
        message: "No active session found"
      });
      return;
    }

    if(typeof message.data !== "object" || !message.data) {
      this.sendToClient(client, "error", {
        code: "INVALID_VERIFYRESULT",
        message: "Invalid verification result data"
      });
      return;
    }

    let verifyRes: {
      shareId: string;
      isValid: boolean;
    } = message.data;

    if(!this.verifyingShares[verifyRes.shareId])
      return;
    let share = this.verifyingShares[verifyRes.shareId];
    
    let validatorIdx = share.verifyMinerSessions.indexOf(client.session);
    if(validatorIdx === -1)
      return;
    
    share.verifyMinerSessions.splice(validatorIdx, 1);
    share.verifyMinerResults[client.session] = verifyRes.isValid;
    
    if(share.verifyMinerSessions.length === 0)
      this.processShareVerification(share);
  }

  private onCliCloseSession(client: IPowClient, message: any) {
    let reqId = message.id || undefined;

    if(!client.session || !this.activeSessions[client.session]) {
      this.sendToClient(client, "error", {
        code: "SESSION_NOT_FOUND",
        message: "No active session found"
      }, reqId);
      return;
    }

    let session =  this.activeSessions[client.session];
    delete this.activeSessions[client.session];
    client.session = null;
    session.activeClient = null;
    this.faucetStore.setSessionMark(session.id, SessionMark.CLOSED);

    let claimToken: string = null;
    if(session.balance >= faucetConfig.claimMinAmount) {
      session.claimable = true;
      if(session.balance > faucetConfig.claimMaxAmount)
        session.balance = faucetConfig.claimMaxAmount;
      claimToken = this.getSignedSession(session);
    }

    this.sendToClient(client, "ok", {
      claimable: session.claimable,
      token: claimToken
    }, reqId);
  }

  private async onCliClaimRewards(client: IPowClient, message: any) {
    let reqId = message.id || undefined;

    if(typeof message.data !== "object" || !message.data || !message.data.token) {
      this.sendToClient(client, "error", {
        code: "INVALID_CLAIM",
        message: "Invalid claim token (missing)"
      });
      return;
    }

    if(faucetConfig.hcaptcha && faucetConfig.hcaptcha.checkBalanceClaim) {
      if(!message.data.captcha) {
        this.sendToClient(client, "error", {
          code: "INVALID_CAPTCHA",
          message: "HCaptcha token required to claim rewards"
        }, reqId);
        return;
      }
      let hcaptchaResponse = await hcaptcha.verify(faucetConfig.hcaptcha.secret, message.data.captcha, client.remoteIp, faucetConfig.hcaptcha.siteKey);
      if(!hcaptchaResponse.success) {
        this.sendToClient(client, "error", {
          code: "INVALID_HCAPTCHA",
          message: "HCaptcha verification failed"
        }, reqId);
        return;
      }
    }

    let sessionSplit = message.data.token.split("|", 2);
    let sessionStr = sessionSplit[0];

    let sessionHash = crypto.createHash("sha256");
    sessionHash.update(faucetConfig.powSessionSecret + "\r\n");
    sessionHash.update(sessionStr);

    if(!sessionStr || sessionSplit[1] !== sessionHash.digest('base64')) {
      this.sendToClient(client, "error", {
        code: "INVALID_CLAIM",
        message: "Invalid claim token (verification failed)"
      }, reqId);
      return;
    }

    let sessionInfo = JSON.parse(Buffer.from(sessionStr, 'base64').toString("utf8"));
    if(!sessionInfo.claimable) {
      this.sendToClient(client, "error", {
        code: "INVALID_CLAIM",
        message: "Invalid claim token (not claimable)"
      }, reqId);
      return;
    }

    var startTime = new Date(sessionInfo.startTime * 1000);
    if(faucetConfig.claimSessionTimeout && ((new Date()).getTime() - startTime.getTime()) / 1000 > faucetConfig.claimSessionTimeout) {
      this.sendToClient(client, "error", {
        code: "INVALID_CLAIM",
        message: "Invalid claim token (expired)"
      }, reqId);
      return;
    }

    let sessionMarks = this.faucetStore.getSessionMarks(sessionInfo.id, [SessionMark.CLOSED]);
    if(sessionMarks.length > 0) {
      this.sendToClient(client, "error", {
        code: "INVALID_CLAIM",
        message: "Session is not allowed to claim (" + sessionMarks.join(",") + ")"
      }, reqId);
      return;
    }

    this.faucetStore.setSessionMark(sessionInfo.id, SessionMark.CLAIMED);

    let claimTx = this.ethWeb3Manager.addClaimTransaction(sessionInfo.targetAddr, sessionInfo.balance);
    this.sendToClient(client, "ok", null, reqId);

    claimTx.once("confirmed", () => {
      this.sendToClient(client, "claimTx", {
        session: sessionInfo.id,
        txHash: claimTx.txhash,
        txBlock: claimTx.txblock
      });
    });
  }

}
