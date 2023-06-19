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

  private async onClientMessage(data: RawData, isBinary: boolean): Promise<void> {
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
        
        this.session.shareCount++;

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
  
  private async onCliVerifyResult(message: any) {
    if(typeof message.data !== "object" || !message.data)
      return this.sendErrorResponse("INVALID_VERIFYRESULT", "Invalid verification result data");

    let verifyRes: {
      shareId: string;
      isValid: boolean;
    } = message.data;

    let verifyValid = PoWShareVerification.processVerificationResult(verifyRes.shareId, this.getFaucetSession().getSessionId(), verifyRes.isValid);
    let verifyReward = BigInt(this.module.getModuleConfig().powShareReward) * BigInt(this.module.getModuleConfig().verifyMinerRewardPerc * 100) / 10000n;
    if(verifyValid && verifyReward > 0n) {
      await this.getFaucetSession().addReward(verifyReward);

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
    let sessionInfo = await this.session.getFaucetSession().getSessionInfo();
    this.sendMessage("ok", sessionInfo, reqId);
  }

}
