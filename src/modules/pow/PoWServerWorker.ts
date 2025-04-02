import { WebSocketServer, WebSocket, RawData } from 'ws';
import { Socket } from "node:net";
import http from "node:http";
import stream from "node:stream";
import os from "node:os";
import { PoWSession } from "./PoWSession.js";
import { IPoWConfig, PoWHashAlgo } from "./PoWConfig.js";
import { PoWValidator } from "./validator/PoWValidator.js";
import { PoWClient } from "./PoWClient.js";
import { ProcessLoadTracker } from "../../utils/ProcessLoadTracker.js";

interface IPoWConnectRequest {
  action: "pow-connect";
  sessionId: string;
  url: string;
  method: string;
  headers: {[key: string]: string};
  head: string;
}

export class PoWServerWorker {
  private serverSymbol = Symbol("pow-server-worker");
  private port: MessagePort;
  private server: http.Server;
  private wss: WebSocketServer;
  private moduleConfig: IPoWConfig;
  private validator: PoWValidator;
  private sessions: {[sessionId: string]: PoWSession} = {};
  private loadTracker: ProcessLoadTracker;

  public constructor(port: MessagePort) {
    if(port) {
      this.port = port;
      this.port.onmessage = (evt) => this.onMessage(evt.data, (evt as any).objs);
    } else if(process.send) {
      process.on("message", this.onMessage.bind(this));
    }

    this.server = http.createServer();
    this.server.on("upgrade", this.onPoWUpgrade.bind(this));

    this.wss = new WebSocketServer({ noServer: true });
    this.wss.on("connection", this.onPoWConnection.bind(this));

    // start validator
    this.validator = new PoWValidator(this);

    // Initialize load tracking
    this.loadTracker = new ProcessLoadTracker((stats) => {
      setTimeout(() => {
        this.sendMessage({
          action: "pow-sysload",
          ...stats,
          activeSessions: this.getActiveClients().map(client => client.getPoWSession().getSessionId()),
        });
      }, 50);
    });

    this.sendMessage({ action: "init" });
  }

  public getModuleConfig(): IPoWConfig {
    return this.moduleConfig;
  }

  public getValidator(): PoWValidator {
    return this.validator;
  }

  private sendMessage(message: any, handle?: any) {
    //console.log("send", message);
    if(this.port) {
      this.port.postMessage(message);
    } else if(process.send) {
      process.send(message, handle);
    }
  }

  public sendSessionAbort(sessionId: string, type: string, reason: string, dirtyProps: {[key: string]: any}) {
    this.sendMessage({
      action: "pow-session-abort",
      sessionId: sessionId,
      type: type,
      reason: reason,
      dirtyProps: dirtyProps,
    });
  }

  public sendSessionReward(sessionId: string, reqId: number, amount: bigint, type: string, dirtyProps: {[key: string]: any}) {
    this.sendMessage({
      action: "pow-session-reward",
      sessionId: sessionId,
      reqId: reqId,
      amount: amount.toString(),
      type: type,
      dirtyProps: dirtyProps,
    });
  }

  public sendSessionFlush(sessionId: string, dirtyProps: {[key: string]: any}) {
    this.sendMessage({
      action: "pow-session-flush",
      sessionId: sessionId,
      dirtyProps: dirtyProps,
    });
  }

  private onMessage(message: any, handle?: any) {
    //console.log("recv", message);

    switch(message.action) {
      case "pow-shutdown":
        this.onPoWShutdown();
        break;
      case "pow-update-config":
        this.moduleConfig = message.config;
        break;
      case "pow-register-session":
        this.onPoWRegisterSession(message.sessionId, message.data);
        break;
      case "pow-destroy-session":
        this.onPoWDestroySession(message.sessionId, message.failed);
        break;
      case "pow-connect":
        this.onPoWConnect(message, handle);
        break;
      case "pow-session-close":
        this.onPoWSessionClose(message.sessionId, message.info);
        break;
      case "pow-session-reward":
        this.onPoWSessionReward(message.sessionId, message.reqId, BigInt(message.amount), BigInt(message.balance));
        break;
    }
  }

  private onPoWRegisterSession(sessionId: string, data: any) {
    let session = new PoWSession(sessionId, this);
    data["pow.idleTime"] = Math.floor(new Date().getTime() / 1000);
    session.loadSessionData(data);
    this.sessions[sessionId] = session;
    this.resetSessionIdleTimer(session);
  }

  private onPoWDestroySession(sessionId: string, failed: boolean) {
    let session = this.sessions[sessionId];
    if(session) {
      if(session.activeClient) {
        session.activeClient.killClient(failed ? "session failed" : "session closed");
        session.activeClient = null;
      }

      delete this.sessions[sessionId];
    }
  }

  private async onPoWConnect(request: IPoWConnectRequest, socket: Socket) {
    const headBuffer = Buffer.from(request.head, 'base64');
    if(!socket) {
      console.error("PoWServerWorker: socket is null");
      return;
    }

    const fakeReq = new http.IncomingMessage(socket);
    fakeReq.headers = request.headers;
    fakeReq.url = request.url;
    fakeReq.method = request.method;
    fakeReq[this.serverSymbol] = request.sessionId;

    if((socket as any)._testWs) {
      // hack for unit tests
      let testWs = (socket as any)._testWs;
      this.wss.emit('connection', testWs, fakeReq);
      return;
    }
    
    socket.resume();
    this.server.emit('upgrade', fakeReq, socket, headBuffer);
  }

  private onPoWUpgrade(req: http.IncomingMessage, socket: stream.Duplex, head: Buffer) {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }

  private onPoWConnection(ws: WebSocket, req: http.IncomingMessage) {
    let sessionId = req[this.serverSymbol];
    if(!sessionId) {
      ws.close();
      return;
    }

    let session = this.sessions[sessionId];
    if(!session) {
      ws.close();
      return;
    }
    
    if(session.activeClient) {
      session.activeClient.killClient("reconnected from another client");
      session.activeClient = null;
    }

    session.activeClient = new PoWClient(this, session, ws);
    this.resetSessionIdleTimer(session);
  }

  private onPoWSessionClose(sessionId: string, info: any) {
    let session = this.sessions[sessionId];
    if(session) {
      session.processSessionClose(info);
    }
  }

  private onPoWSessionReward(sessionId: string, reqId: number, amount: bigint, balance: bigint) {
    let session = this.sessions[sessionId];
    if(session) {
      session.processReward(reqId, amount, balance);
    }
  }

  private onPoWShutdown() {
    // flush all sessions
    for(let sessionId in this.sessions) {
      let session = this.sessions[sessionId];
      let dirtyProps = session.getDirtyProps(true);
      if (Object.keys(dirtyProps).length > 0) {
        this.sendSessionFlush(sessionId, dirtyProps);
      }

      if(session.activeClient) {
        session.activeClient.killClient("server shutdown");
        session.activeClient = null;
      }
    }

    if (this.loadTracker) {
      this.loadTracker.stop();
    }

    this.wss.close();
    this.server.close();

    setTimeout(() => {
      process.exit(0);
    }, 100);
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
      case PoWHashAlgo.NICKMINER:
        return PoWHashAlgo.NICKMINER.toString() +
        "|" + this.moduleConfig.powNickMinerParams.hash +
        "|" + this.moduleConfig.powNickMinerParams.sigR +
        "|" + this.moduleConfig.powNickMinerParams.sigV +
        "|" + this.moduleConfig.powNickMinerParams.count +
        "|" + this.moduleConfig.powNickMinerParams.suffix +
        "|" + this.moduleConfig.powNickMinerParams.prefix +
        "|" + this.moduleConfig.powDifficulty;
    }
  }

  public getActiveClients(): PoWClient[] {
    let clients: PoWClient[] = [];
    for(let sessionId in this.sessions) {
      let session = this.sessions[sessionId];
      if(session.activeClient)
        clients.push(session.activeClient);
    }

    return clients;
  }

  public getPoWSession(sessionId: string): PoWSession {
    return this.sessions[sessionId];
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
        session.closeSession("timeout");
      }, timeout * 1000);
    }
  }
}
  