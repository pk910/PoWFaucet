
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

  protected override startModule(): void {
    // register websocket endpoint (/pow)
    ServiceManager.GetService(FaucetHttpServer).addWssEndpoint("pow", /^\/pow($|\?)/, (req, ws, ip) => this.processPoWClientWebSocket(req, ws, ip));

    // start validator
    this.validator = new PoWValidator(this);

    // register faucet action hooks
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionStart, 10, "mining session",
      (session: FaucetSession, userInputs: any, responseData: any) => this.processSessionStart(session, responseData)
    );
    this.moduleManager.addActionHook(
      this, ModuleHookAction.SessionComplete, 10, "kill clients",
      (session: FaucetSession) => this.processSessionComplete(session)
    );
  }

  protected override stopModule(): void {
    ServiceManager.GetService(FaucetHttpServer).removeWssEndpoint("pow");

    this.validator.dispose();
    this.validator = null;
  }

  protected override onConfigReload(): void {
    
  }

  private async processSessionStart(session: FaucetSession, responseData: any): Promise<void> {
    session.addBlockingTask(this.moduleName, "mining", this.moduleConfig.powSessionTimeout); // this prevents the session from progressing to claimable before this module allows it

    // start mining session
  }

  private async processSessionComplete(session: FaucetSession): Promise<void> {
    let powSession = this.getPoWSession(session);
    powSession.activeClient?.killClient("session closed");
  }

  public async processPoWSessionClose(session: FaucetSession): Promise<void> {
    session.resolveBlockingTask(this.moduleName, "mining");

  }

  private processPoWClientWebSocket(req: IncomingMessage, ws: WebSocket, remoteIp: string) {
    let url = new URL(req.url);
    let sessionId = url.searchParams.get("session");
    if(!sessionId) {
      ws.close(1, "session id missing");
      return;
    }
    let session = ServiceManager.GetService(SessionManager).getSession(sessionId, [FaucetSessionStatus.RUNNING]);
    if(!session) {
      ws.close(1, "session not found");
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
