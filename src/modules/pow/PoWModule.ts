import * as crypto from "crypto";
import { ServiceManager } from "../../common/ServiceManager.js";
import { FaucetSession, FaucetSessionStatus } from "../../session/FaucetSession.js";
import { BaseModule } from "../BaseModule.js";
import { ModuleHookAction } from "../ModuleManager.js";
import { defaultConfig, IPoWConfig, PoWHashAlgo } from './PoWConfig.js';
import { FaucetHttpServer } from "../../webserv/FaucetHttpServer.js";
import { IncomingMessage } from "http";
import { WebSocket } from 'ws';
import { PoWValidator } from "./validator/PoWValidator.js";
import { SessionManager } from "../../session/SessionManager.js";
import { PoWClient } from "./PoWClient.js";
import { PoWSession } from "./PoWSession.js";
import { FaucetError } from "../../common/FaucetError.js";
import { FaucetLogLevel, FaucetProcess } from "../../common/FaucetProcess.js";

export class PoWModule extends BaseModule<IPoWConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
  private validator: PoWValidator;
  private powClients: {[sessionId: string]: PoWClient} = {};

  protected override startModule(): Promise<void> {
    // register websocket endpoint (/pow)
    ServiceManager.GetService(FaucetHttpServer).addWssEndpoint("pow", /^\/ws\/pow($|\?)/, (req, ws, ip) => this.processPoWClientWebSocket(req, ws, ip));

    // start validator
    this.validator = new PoWValidator(this);

    // register faucet action hooks
    this.moduleManager.addActionHook(
      this, ModuleHookAction.ClientConfig, 1, "mining config", 
      async (clientConfig: any) => this.processClientConfig(clientConfig)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionInfo, 1, "mining state", 
      async (session: FaucetSession, moduleState: any) => this.processSessionInfo(session, moduleState)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 10, "mining session",
      (session: FaucetSession) => this.processSessionStart(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionRestore, 10, "mining session restore",
      (session: FaucetSession) => this.processSessionRestore(session)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionComplete, 10, "kill clients",
      (session: FaucetSession) => this.processSessionComplete(session)
    );
    return Promise.resolve();
  }

  protected override stopModule(): Promise<void> {
    ServiceManager.GetService(FaucetHttpServer).removeWssEndpoint("pow");

    this.validator.dispose();
    this.validator = null;
    return Promise.resolve();
  }

  protected override onConfigReload(): void {
    
  }

  private processClientConfig(clientConfig: any) {
    let powParams;
    switch(this.moduleConfig.powHashAlgo) {
      case PoWHashAlgo.SCRYPT:
        powParams = {
          a: PoWHashAlgo.SCRYPT,
          n: this.moduleConfig.powScryptParams.cpuAndMemory,
          r: this.moduleConfig.powScryptParams.blockSize,
          p: this.moduleConfig.powScryptParams.parallelization,
          l: this.moduleConfig.powScryptParams.keyLength,
        };
        break;
      case PoWHashAlgo.CRYPTONIGHT:
        powParams = {
          a: PoWHashAlgo.CRYPTONIGHT,
          c: this.moduleConfig.powCryptoNightParams.algo,
          v: this.moduleConfig.powCryptoNightParams.variant,
          h: this.moduleConfig.powCryptoNightParams.height,
        };
        break;
      case PoWHashAlgo.ARGON2:
        powParams = {
          a: PoWHashAlgo.ARGON2,
          t: this.moduleConfig.powArgon2Params.type,
          v: this.moduleConfig.powArgon2Params.version,
          i: this.moduleConfig.powArgon2Params.timeCost,
          m: this.moduleConfig.powArgon2Params.memoryCost,
          p: this.moduleConfig.powArgon2Params.parallelization,
          l: this.moduleConfig.powArgon2Params.keyLength,
        };
        break;
    }

    clientConfig[this.moduleName] = {
      powTimeout: this.moduleConfig.powSessionTimeout,
      powIdleTimeout: this.moduleConfig.powIdleTimeout,
      powParams: powParams,
      powDifficulty: this.moduleConfig.powDifficulty,
      powNonceCount: this.moduleConfig.powNonceCount,
      powHashrateLimit: this.moduleConfig.powHashrateSoftLimit,
    };
  }

  private async processSessionInfo(session: FaucetSession, moduleState: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    if(session.getSessionStatus() !== FaucetSessionStatus.RUNNING)
      return;
    let powSession = this.getPoWSession(session);
    moduleState[this.moduleName] = {
      lastNonce: powSession.lastNonce,
      preImage: powSession.preImage,
      shareCount: powSession.shareCount,
    }
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;

    session.addBlockingTask(this.moduleName, "mining", this.moduleConfig.powSessionTimeout); // this prevents the session from progressing to claimable before this module allows it
    session.setDropAmount(0n);

    // start mining session
    let powSession = this.getPoWSession(session);
    powSession.preImage = crypto.randomBytes(8).toString('base64');
    this.resetSessionIdleTimer(powSession);
  }

  private async processSessionRestore(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    let powSession = this.getPoWSession(session);
    this.resetSessionIdleTimer(powSession);
  }

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    setTimeout(() => {
      let powSession = this.getPoWSession(session);
      if(session.getSessionStatus() === FaucetSessionStatus.FAILED)
        powSession.activeClient?.killClient("session failed: [" + session.getSessionData("failed.code") + "] " + session.getSessionData("failed.reason"));
      else
        powSession.activeClient?.killClient("session closed");
    }, 100);
  }

  public async processPoWSessionClose(session: FaucetSession): Promise<void> {
    session.resolveBlockingTask(this.moduleName, "mining");
    await session.tryProceedSession();
  }

  private async processPoWClientWebSocket(req: IncomingMessage, ws: WebSocket, remoteIp: string): Promise<void> {
    let sessionId: string;
    try {
      let urlParts = req.url.split("?");
      let url = new URLSearchParams(urlParts[1]);
      if(!(sessionId = url.get("session"))) {
        throw "session id missing";
      }
    } catch(ex) {
      ws.send(JSON.stringify({
        action: "error",
        data: {
          code: "INVALID_SESSION",
          message: "session id missing"
        }
      }));
      ws.close();
      return;
    }
    let session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]);
    if(!session) {
      ws.send(JSON.stringify({
        action: "error",
        data: {
          code: "INVALID_SESSION",
          message: "session not found"
        }
      }));
      ws.close();
      return;
    }

    try {
      await session.updateRemoteIP(remoteIp);
    } catch(ex) {
      let errData = ex instanceof FaucetError ? {code: ex.getCode(), message: ex.message} : {code: "INTERNAL_ERROR", message: "Could not update session IP: " + ex.toString()};
      ws.send(JSON.stringify({
        action: "error",
        data: errData
      }));
      ws.close();
      return;
    }

    let powSession = this.getPoWSession(session);
    let powClient: PoWClient;
    if((powClient = powSession.activeClient)) {
      // kill other client
      powClient.killClient("reconnected from another client");
    }

    powClient = new PoWClient(this, powSession, ws);
    this.powClients[session.getSessionId()] = powClient;
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "connected PoWClient: " + session.getSessionId());
    
    this.resetSessionIdleTimer(powSession);
  }

  public disposePoWClient(client: PoWClient, reason: string) {
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "closed PoWClient: " + client.getFaucetSession().getSessionId() + " (" + reason + ")");
    this.resetSessionIdleTimer(client.getPoWSession());

    if(this.powClients[client.getFaucetSession().getSessionId()] === client) {
      delete this.powClients[client.getFaucetSession().getSessionId()];
    }
    else {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "disposePoWClient: client not in active clients list: " + client.getFaucetSession().getSessionId());
    }
  }

  public getActiveClients(): PoWClient[] {
    return Object.values(this.powClients);
  }

  public getPoWSession(session: FaucetSession): PoWSession {
    let powSession: PoWSession;
    if(!(powSession = session.getSessionModuleRef("pow.session"))) {
      powSession = new PoWSession(session);
      session.setSessionModuleRef("pow.session", powSession);
    }
    return powSession;
  }

  public getValidator(): PoWValidator {
    return this.validator;
  }

  public getPoWParamsStr(): string {
    switch(this.moduleConfig.powHashAlgo) {
      case PoWHashAlgo.SCRYPT:
        return PoWHashAlgo.SCRYPT.toString() +
        "|" + this.moduleConfig.powScryptParams.cpuAndMemory +
        "|" + this.moduleConfig.powScryptParams.blockSize +
        "|" + this.moduleConfig.powScryptParams.parallelization +
        "|" + this.moduleConfig.powScryptParams.keyLength +
        "|" + this.moduleConfig.powDifficulty;
      case PoWHashAlgo.CRYPTONIGHT:
        return PoWHashAlgo.CRYPTONIGHT.toString() +
        "|" + this.moduleConfig.powCryptoNightParams.algo +
        "|" + this.moduleConfig.powCryptoNightParams.variant +
        "|" + this.moduleConfig.powCryptoNightParams.height +
        "|" + this.moduleConfig.powDifficulty;
      case PoWHashAlgo.ARGON2:
        return PoWHashAlgo.ARGON2.toString() +
        "|" + this.moduleConfig.powArgon2Params.type +
        "|" + this.moduleConfig.powArgon2Params.version +
        "|" + this.moduleConfig.powArgon2Params.timeCost +
        "|" + this.moduleConfig.powArgon2Params.memoryCost +
        "|" + this.moduleConfig.powArgon2Params.parallelization +
        "|" + this.moduleConfig.powArgon2Params.keyLength +
        "|" + this.moduleConfig.powDifficulty;
    }
  }

  private resetSessionIdleTimer(session: PoWSession) {
    let hasActiveClient = !!session.activeClient;
    let idleTimer = session.idleTimer;

    if(hasActiveClient && idleTimer) {
      clearTimeout(idleTimer);
      session.idleTimer = null;
    }
    else if(!hasActiveClient && !idleTimer && session.idleTime && this.moduleConfig.powIdleTimeout) {
      let now = Math.floor(new Date().getTime() / 1000);
      let timeout = session.idleTime + this.moduleConfig.powIdleTimeout - now;
      if(timeout < 0)
        timeout = 0;
      session.idleTimer = setTimeout(() => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "session idle timeout: " + session.getFaucetSession().getSessionId());
        this.processPoWSessionClose(session.getFaucetSession());
      }, timeout * 1000);
    }
  }
  
}
