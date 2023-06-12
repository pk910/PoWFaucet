import * as crypto from "crypto";
import { ServiceManager } from "../../common/ServiceManager";
import { FaucetSession, FaucetSessionStatus } from "../../session/FaucetSession";
import { BaseModule } from "../BaseModule";
import { ModuleHookAction } from "../ModuleManager";
import { IPoWConfig, PoWHashAlgo } from './PoWConfig';
import { FaucetHttpServer } from "../../webserv/FaucetHttpServer";
import { IncomingMessage } from "http";
import { WebSocket } from 'ws';
import { PoWValidator } from "./validator/PoWValidator";
import { SessionManager } from "../../session/SessionManager";
import { PoWClient } from "./PoWClient";
import { PoWSession } from "./PoWSession";

export class PoWModule extends BaseModule<IPoWConfig> {
  private validator: PoWValidator;
  private powClients: PoWClient[] = [];

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
      (session: FaucetSession, userInputs: any, responseData: any) => this.processSessionStart(session, responseData)
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
          d: this.moduleConfig.powScryptParams.difficulty,
        };
        break;
      case PoWHashAlgo.CRYPTONIGHT:
        powParams = {
          a: PoWHashAlgo.CRYPTONIGHT,
          c: this.moduleConfig.powCryptoNightParams.algo,
          v: this.moduleConfig.powCryptoNightParams.variant,
          h: this.moduleConfig.powCryptoNightParams.height,
          d: this.moduleConfig.powCryptoNightParams.difficulty,
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
          d: this.moduleConfig.powArgon2Params.difficulty,
        };
        break;
    }

    clientConfig[this.moduleName] = {
      powTimeout: this.moduleConfig.powSessionTimeout,
      powParams: powParams,
      powNonceCount: this.moduleConfig.powNonceCount,
      powHashrateLimit: this.moduleConfig.powHashrateSoftLimit,
    };
  }

  private async processSessionInfo(session: FaucetSession, moduleState: any): Promise<void> {
    if(session.getSessionStatus() !== FaucetSessionStatus.RUNNING)
      return;
    let powSession = this.getPoWSession(session);
    moduleState[this.moduleName] = {
      lastNonce: powSession.lastNonce,
      preImage: powSession.preImage,
      shareCount: powSession.shareCount,
    }
  }

  private async processSessionStart(session: FaucetSession, responseData: any): Promise<void> {
    session.addBlockingTask(this.moduleName, "mining", this.moduleConfig.powSessionTimeout); // this prevents the session from progressing to claimable before this module allows it
    session.setDropAmount(0n);

    // start mining session
    let powSession = this.getPoWSession(session);
    powSession.preImage = crypto.randomBytes(8).toString('base64')
  }

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    setTimeout(() => {
      let powSession = this.getPoWSession(session);
      powSession.activeClient?.killClient("session closed");
    }, 500);
  }

  public async processPoWSessionClose(session: FaucetSession): Promise<void> {
    session.resolveBlockingTask(this.moduleName, "mining");
    await session.tryProceedSession();
  }

  private processPoWClientWebSocket(req: IncomingMessage, ws: WebSocket, remoteIp: string) {
    let sessionId: string;
    try {
      let urlParts = req.url.split("?");
      let url = new URLSearchParams(urlParts[1]);
      sessionId = url.get("session");
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
    if(!sessionId) {
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
    session.setRemoteIP(remoteIp);

    let powClient: PoWClient;
    if((powClient = session.getSessionModuleRef("pow.client"))) {
      // kill other client
      powClient.killClient("reconnected from another client");
    }

    powClient = new PoWClient(this, this.getPoWSession(session), ws);
    this.powClients.push(powClient);
  }

  public disposePoWClient(client: PoWClient) {
    let clientIdx = this.powClients.indexOf(client);
    if(clientIdx !== -1)
      this.powClients.splice(clientIdx, 1);
  }

  public getActiveClients(): PoWClient[] {
    return this.powClients.slice();
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
        "|" + this.moduleConfig.powScryptParams.difficulty;
      case PoWHashAlgo.CRYPTONIGHT:
        return PoWHashAlgo.CRYPTONIGHT.toString() +
        "|" + this.moduleConfig.powCryptoNightParams.algo +
        "|" + this.moduleConfig.powCryptoNightParams.variant +
        "|" + this.moduleConfig.powCryptoNightParams.height +
        "|" + this.moduleConfig.powCryptoNightParams.difficulty;
      case PoWHashAlgo.ARGON2:
        return PoWHashAlgo.ARGON2.toString() +
        "|" + this.moduleConfig.powArgon2Params.type +
        "|" + this.moduleConfig.powArgon2Params.version +
        "|" + this.moduleConfig.powArgon2Params.timeCost +
        "|" + this.moduleConfig.powArgon2Params.memoryCost +
        "|" + this.moduleConfig.powArgon2Params.parallelization +
        "|" + this.moduleConfig.powArgon2Params.keyLength +
        "|" + this.moduleConfig.powArgon2Params.difficulty;
    }
  }

  
}
