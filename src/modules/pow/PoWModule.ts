import * as crypto from "crypto";
import * as stream from 'node:stream';
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
import { FaucetStatsLog } from "../../services/FaucetStatsLog.js";
import { PoWServer } from "./PoWServer.js";
import { Socket } from "node:net";
import { getNewGuid } from "../../utils/GuidUtils.js";
import { FaucetHttpResponse } from "../../webserv/FaucetHttpServer.js";
import { FaucetWebApi, IFaucetApiUrl } from "../../webserv/FaucetWebApi.js";

export class PoWModule extends BaseModule<IPoWConfig> {
  protected readonly moduleDefaultConfig = defaultConfig;
 
  private powServers: {[serverId: string]: PoWServer} = {};

  protected override startModule(): Promise<void> {
    // register websocket endpoint (/pow)
    ServiceManager.GetService(FaucetHttpServer).addRawEndpoint("pow", /^\/ws\/pow($|\?)/, (req, socket, head, ip) => this.processPoWClientWebSocket(req, socket, head, ip));

    // register REST API endpoints for agent-friendly PoW
    let webApi = ServiceManager.GetService(FaucetWebApi);
    webApi.registerApiEndpoint("powChallenge", (req, url, body) => this.handlePowChallenge(req, url));
    webApi.registerApiEndpoint("powSubmit", (req, url, body) => this.handlePowSubmit(req, url));
    webApi.registerApiEndpoint("powCloseSession", (req, url, body) => this.handlePowCloseSession(req, url));

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
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("powChallenge");
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("powSubmit");
    ServiceManager.GetService(FaucetWebApi).removeApiEndpoint("powCloseSession");

    let shutdownPromises: Promise<void>[] = [];
    for(let serverId in this.powServers) {
      let powServer = this.powServers[serverId];
      shutdownPromises.push(powServer.shutdown());
    }

    return Promise.all(shutdownPromises).catch((err) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "error shutting down PoW servers: " + err.toString());
    }).then();
  }

  protected override onConfigReload(): void {
    for(let serverId in this.powServers) {
      let powServer = this.powServers[serverId];
      powServer.updateConfig(this.moduleConfig);
    }
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
      case PoWHashAlgo.NICKMINER:
        powParams = {
          a: PoWHashAlgo.NICKMINER,
          i: this.moduleConfig.powNickMinerParams.hash,
          r: this.moduleConfig.powNickMinerParams.sigR,
          v: this.moduleConfig.powNickMinerParams.sigV,
          c: this.moduleConfig.powNickMinerParams.count,
          s: this.moduleConfig.powNickMinerParams.suffix,
          p: this.moduleConfig.powNickMinerParams.prefix,
        };
        break;
    }

    clientConfig[this.moduleName] = {
      powTimeout: this.moduleConfig.powSessionTimeout,
      powIdleTimeout: this.moduleConfig.powIdleTimeout,
      powParams: powParams,
      powDifficulty: this.moduleConfig.powDifficulty,
      powHashrateLimit: this.moduleConfig.powHashrateSoftLimit,
    };
  }

  private async processSessionInfo(session: FaucetSession, moduleState: any): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    if(session.getSessionStatus() !== FaucetSessionStatus.RUNNING)
      return;

    moduleState[this.moduleName] = {
      lastNonce: session.getSessionData("pow.lastNonce", 0),
      preImage: session.getSessionData("pow.preimage"),
      shareCount: session.getSessionData("pow.shareCount", 0),
    }
  }

  private async processSessionStart(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;

    session.addBlockingTask(this.moduleName, "mining", this.moduleConfig.powSessionTimeout); // this prevents the session from progressing to claimable before this module allows it
    session.setDropAmount(0n);

    // start mining session
    let preimage = session.getSessionData("pow.preimage");
    if(!preimage) {
      preimage = crypto.randomBytes(8).toString('base64');
      session.setSessionData("pow.preimage", preimage);
    }

    // create session on server
    await this.getPoWServerForSession(session, true);
  }

  private async processSessionRestore(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;
    if(session.getSessionStatus() !== FaucetSessionStatus.RUNNING)
      return;
    await this.getPoWServerForSession(session, true);
  }

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return;

    let powServer: PoWServer = await session.getSessionModuleRef("pow.serverPromise");
    if(powServer) {
      setTimeout(() => {
        powServer.destroySession(session.getSessionId(), session.getSessionStatus() === FaucetSessionStatus.FAILED);

        if (powServer.getSessionCount() === 0 && Object.keys(this.powServers).length > 1) {
          this.stopServer(powServer);
        }
      }, 500);
    }
  }

  public async processPoWSessionClose(session: FaucetSession): Promise<void> {
    session.resolveBlockingTask(this.moduleName, "mining");
    await session.tryProceedSession();
  }

  private async processPoWClientWebSocket(req: IncomingMessage, socket: Socket, head: Buffer, remoteIp: string): Promise<void> {
    let sessionId: string;
    let clientVersion: string;
    try {
      let urlParts = req.url.split("?");
      let url = new URLSearchParams(urlParts[1]);
      if(!(sessionId = url.get("session"))) {
        throw "session id missing";
      }
      clientVersion = url.get("cliver");
    } catch(ex) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n{"action": "error", "data": {"code": "INVALID_SESSION", "message": "session id missing"}}');
      socket.end();
      return;
    }

    let session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]);
    if(!session) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n{"action": "error", "data": {"code": "INVALID_SESSION", "message": "session not found"}}');
      socket.end();
      return;
    }

    try {
      await session.updateRemoteIP(remoteIp);
    } catch(ex) {
      let errData = ex instanceof FaucetError ? {code: ex.getCode(), message: ex.message} : {code: "INTERNAL_ERROR", message: "Could not update session IP: " + ex.toString()};
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n{"action": "error", "data": ' + JSON.stringify(errData) + '}');
      socket.end();
      return;
    }

    session.setSessionData("cliver", clientVersion);

    let powServer = await this.getPoWServerForSession(session, true);
    powServer.connect(session.getSessionId(), req, socket, head);
  }

  private getPoWServerForSession(session: FaucetSession, create: boolean = false): Promise<PoWServer> {
    let serverPromise = session.getSessionModuleRef("pow.serverPromise");
    if(serverPromise) {
      return serverPromise;
    }

    if(!create)
      return null;

    let server: PoWServer;
    let suitableServers: {server: PoWServer, sessions: number}[] = [];
    for(let serverId in this.powServers) {
      let powServer = this.powServers[serverId];
      let sessionCount = powServer.getSessionCount();
      if(sessionCount < this.moduleConfig.powSessionsPerServer || this.moduleConfig.powSessionsPerServer === 0) {
        suitableServers.push({server: powServer, sessions: sessionCount});
      }
    }
    
    if(suitableServers.length > 0) {
      // use the server with the most sessions
      suitableServers.sort((a, b) => b.sessions - a.sessions);
      server = suitableServers[0].server;
    }
    else {
      server = new PoWServer(this, getNewGuid());
      this.powServers[server.getServerId()] = server;
    }

    let registrationPromise = server.registerSession(session).then(() => {
      return server;
    });

    session.setSessionModuleRef("pow.serverPromise", registrationPromise);
    return registrationPromise;
  }

  private async handlePowChallenge(req: IncomingMessage, url: IFaucetApiUrl): Promise<any> {
    let sessionId = url.query['session'] as string;
    if (!sessionId)
      return new FaucetHttpResponse(400, "Bad Request", "Missing session parameter");

    let session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]);
    if (!session)
      return new FaucetHttpResponse(404, "Not Found", "Session not found");

    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return new FaucetHttpResponse(400, "Bad Request", "PoW module is skipped for this session");

    let preimage = session.getSessionData("pow.preimage");
    if (!preimage)
      return new FaucetHttpResponse(400, "Bad Request", "PoW not initialized for session");

    let restNonceStart = session.getSessionData("pow.restNonce", 0) as number;
    let nonceCount = 50000;
    session.setSessionData("pow.restNonce", restNonceStart + nonceCount);

    let powParams: any;
    switch(this.moduleConfig.powHashAlgo) {
      case PoWHashAlgo.SCRYPT:
        powParams = {
          n: this.moduleConfig.powScryptParams.cpuAndMemory,
          r: this.moduleConfig.powScryptParams.blockSize,
          p: this.moduleConfig.powScryptParams.parallelization,
          l: this.moduleConfig.powScryptParams.keyLength,
        };
        break;
      case PoWHashAlgo.ARGON2:
        powParams = {
          type: this.moduleConfig.powArgon2Params.type,
          version: this.moduleConfig.powArgon2Params.version,
          timeCost: this.moduleConfig.powArgon2Params.timeCost,
          memoryCost: this.moduleConfig.powArgon2Params.memoryCost,
          parallelization: this.moduleConfig.powArgon2Params.parallelization,
          keyLength: this.moduleConfig.powArgon2Params.keyLength,
        };
        break;
      case PoWHashAlgo.CRYPTONIGHT:
        powParams = {
          algo: this.moduleConfig.powCryptoNightParams.algo,
          variant: this.moduleConfig.powCryptoNightParams.variant,
          height: this.moduleConfig.powCryptoNightParams.height,
        };
        break;
      case PoWHashAlgo.NICKMINER:
        powParams = {
          hash: this.moduleConfig.powNickMinerParams.hash,
          sigR: this.moduleConfig.powNickMinerParams.sigR,
          sigV: this.moduleConfig.powNickMinerParams.sigV,
          count: this.moduleConfig.powNickMinerParams.count,
          suffix: this.moduleConfig.powNickMinerParams.suffix,
          prefix: this.moduleConfig.powNickMinerParams.prefix,
        };
        break;
    }

    return {
      algo: this.moduleConfig.powHashAlgo,
      params: powParams,
      difficulty: this.moduleConfig.powDifficulty,
      preimage,
      nonceStart: restNonceStart,
      nonceCount,
      shareReward: this.moduleConfig.powShareReward,
    };
  }

  private async handlePowSubmit(req: IncomingMessage, url: IFaucetApiUrl, body: Buffer): Promise<any> {
    if (req.method !== "POST")
      return new FaucetHttpResponse(405, "Method Not Allowed");

    let input: any;
    try {
      input = JSON.parse(body.toString("utf8"));
    } catch(ex) {
      return { valid: false, error: "Invalid JSON body" };
    }

    if (!input.session || input.nonce === undefined)
      return { valid: false, error: "Missing session or nonce" };

    let session = ServiceManager.GetService(SessionManager).getSession(input.session, [FaucetSessionStatus.RUNNING]);
    if (!session)
      return { valid: false, error: "Session not found or not running" };

    if(session.getSessionData<Array<string>>("skip.modules", []).indexOf(this.moduleName) !== -1)
      return { valid: false, error: "PoW module is skipped for this session" };

    let restNonceEnd = session.getSessionData("pow.restNonce", 0) as number;
    let restSubmittedNonce = session.getSessionData("pow.restSubmittedNonce", 0) as number;
    if (input.nonce < restSubmittedNonce || input.nonce >= restNonceEnd)
      return { valid: false, error: "Nonce out of range or already submitted" };

    let powServer: PoWServer;
    try {
      powServer = await session.getSessionModuleRef("pow.serverPromise");
      if (!powServer)
        return { valid: false, error: "PoW server not ready" };
    } catch(ex) {
      return { valid: false, error: "PoW server not available" };
    }

    let result: {isValid: boolean};
    try {
      result = await powServer.validateShareREST(session.getSessionId(), input.nonce, input.data || "");
    } catch(ex) {
      return { valid: false, error: "Validation error: " + (ex.message || ex) };
    }

    if (result.isValid) {
      session.setSessionData("pow.restSubmittedNonce", input.nonce);
      let rewardAmount = BigInt(this.moduleConfig.powShareReward);
      await session.addReward(rewardAmount);

      let faucetStats = ServiceManager.GetService(FaucetStatsLog);
      faucetStats.statShareRewards += rewardAmount;
      faucetStats.statShareCount++;

      return {
        valid: true,
        balance: session.getDropAmount().toString(),
      };
    }

    return { valid: false, error: "Invalid share (hash does not meet difficulty target)" };
  }

  private async handlePowCloseSession(req: IncomingMessage, url: IFaucetApiUrl): Promise<any> {
    let sessionId = url.query['session'] as string;
    if (!sessionId)
      return new FaucetHttpResponse(400, "Bad Request", "Missing session parameter");

    let session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]);
    if (!session)
      return new FaucetHttpResponse(404, "Not Found", "Session not found or not running");

    this.processPoWSessionClose(session);
    let info = await session.getSessionInfo();
    return info;
  }

  private stopServer(server: PoWServer) {
    server.shutdown();
    delete this.powServers[server.getServerId()];
  }
  
}
