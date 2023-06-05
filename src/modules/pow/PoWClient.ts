import { WebSocket, RawData } from 'ws';
import { PoWSession } from './PoWSession';
import { ServiceManager } from '../../common/ServiceManager';
import { PoWShareVerification } from './PoWShareVerification';
import { FaucetProcess, FaucetLogLevel } from '../../common/FaucetProcess';
import { FaucetStatsLog } from '../../services/FaucetStatsLog';
import { FaucetSession } from '../../session/FaucetSession';
import { PoWModule } from './PoWModule';

export class PoWClient {
  private module: PoWModule;
  private socket: WebSocket;
  private session: PoWSession;
  private pingTimer: NodeJS.Timer = null;
  private lastPingPong: Date;

  public constructor(module: PoWModule, session: PoWSession, socket: WebSocket) {
    this.module = module;
    this.session = session;
    this.socket = socket;
    this.lastPingPong = new Date();

    this.session.activeClient = this;

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
      this.dispose("client error");
    });
    this.socket.on("close", () => {
      this.dispose("client closed");
    });
    this.pingClientLoop();
  }

  public isReady(): boolean {
    return !!this.socket;
  }

  public getPoWSession(): PoWSession {
    return this.session;
  }

  public getFaucetSession(): FaucetSession {
    return this.session.getFaucetSession();
  }

  private dispose(reason: string) {
    this.socket = null;

    this.module.disposePoWClient(this);

    if(this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
    
    if(this.session)
      this.session.activeClient = null;
  }

  public killClient(reason?: string) {
    if(!this.socket)
      return;
    try {
      this.sendErrorResponse("CLIENT_KILLED", "Client killed: " + (reason || ""), null, FaucetLogLevel.HIDDEN);
      this.socket.close();
    } catch(ex) {}
    this.dispose(reason);
  }

  private pingClientLoop() {
    this.pingTimer = setInterval(() => {
      if(!this.socket)
        return;
      
      let pingpongTime = Math.floor(((new Date()).getTime() - this.lastPingPong.getTime()) / 1000);
      if(pingpongTime > this.module.getModuleConfig().powPingTimeout) {
        this.killClient("ping timeout");
        return;
      }
      
      this.socket.ping();
    }, this.module.getModuleConfig().powPingInterval * 1000);
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

  protected async onClientMessage(data: RawData, isBinary: boolean): Promise<void> {
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
      case "foundShare":
        await this.onCliFoundShare(message);
        break;
      case "verifyResult":
        await this.onCliVerifyResult(message);
        break;
      case "closeSession":
        await this.onCliCloseSession(message);
        break;
      default:
        this.sendMessage("error", {
          code: "INVALID_ACTION",
          message: "Unknown action"
        }, message.id);
        break;
    }
  }

  private onCliFoundShare(message: any) {
    let reqId = message.id || undefined;

    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_SHARE", "Invalid share data", message);
    
    let moduleConfig = this.module.getModuleConfig();
    let shareData: {
      nonces: number[];
      params: string;
      hashrate: number;
    } = message.data;

    if(shareData.params !== this.module.getPoWParamsStr()) 
      return this.sendErrorResponse("INVALID_SHARE", "Invalid share params", message);
    if(shareData.nonces.length !== moduleConfig.powNonceCount)
      return this.sendErrorResponse("INVALID_SHARE", "Invalid nonce count", message);
    
    let lastNonce = this.session.lastNonce;
    for(let i = 0; i < shareData.nonces.length; i++) {
      if(shareData.nonces[i] <= lastNonce)
        return this.sendErrorResponse("INVALID_SHARE", "Nonce too low", message);
      lastNonce = shareData.nonces[i];
    }
    this.session.lastNonce = lastNonce;
    if(shareData.hashrate) {
      let reportedHashRates = this.session.reportedHashrate;
      reportedHashRates.push(shareData.hashrate);
      if(reportedHashRates.length > 5)
        reportedHashRates.splice(0, 1);
      this.session.reportedHashrate = reportedHashRates;
    }
    
    this.session.missedVerifications = 0;
    
    if(moduleConfig.powHashrateHardLimit > 0) {
      let sessionAge = Math.floor((new Date()).getTime() / 1000) - this.getFaucetSession().getStartTime();
      let nonceLimit = (sessionAge + 30) * moduleConfig.powHashrateHardLimit;
      if(lastNonce > nonceLimit)
        return this.sendErrorResponse("HASHRATE_LIMIT", "Nonce too high (did you evade the hashrate limit?) " + sessionAge + "/" + nonceLimit, message);
    }

    let shareVerification = new PoWShareVerification(this.module, this.session, shareData.nonces);
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
    }, (err) => {
      if(this.session) {
        this.sendErrorResponse("VERIFY_FAILED", "Share verification error" + (err ? ": " + err.toString() : ""), message);
      }
    });
  }
  
  private onCliVerifyResult(message: any) {
    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_VERIFYRESULT", "Invalid verification result data");

    let verifyRes: {
      shareId: string;
      isValid: boolean;
    } = message.data;

    let verifyValid = PoWShareVerification.processVerificationResult(verifyRes.shareId, this.getFaucetSession().getSessionId(), verifyRes.isValid);
    let verifyReward = BigInt(this.module.getModuleConfig().powShareReward) * BigInt(this.module.getModuleConfig().verifyMinerRewardPerc * 100) / 10000n;
    if(verifyValid && verifyReward > 0n) {
      this.getFaucetSession().addReward(verifyReward);

      let faucetStats = ServiceManager.GetService(FaucetStatsLog);
      faucetStats.statVerifyReward += verifyReward;

      this.sendMessage("updateBalance", {
        balance: this.getFaucetSession().getDropAmount().toString(),
        reason: "valid verification"
      });
    }
  }

  private async onCliCloseSession(message: any) {
    let reqId = message.id || undefined;
    await this.module.processPoWSessionClose(this.session.getFaucetSession());
    this.sendMessage("ok", {
      status: this.session.getFaucetSession().getSessionStatus(),
    }, reqId);
  }

  /*
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

    let claimTx = ServiceManager.GetService(EthClaimManager).addClaimTransaction(sessionInfo.targetAddr, BigInt(sessionInfo.balance), sessionInfo.id);
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

    let claimTx = ServiceManager.GetService(EthClaimManager).getClaimTransaction(message.data.sessionId);
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
      lastIdx: ServiceManager.GetService(EthClaimManager).getLastProcessedClaimIdx(),
    }, reqId);
  }
  */

}
