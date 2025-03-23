import * as http from 'node:http';
import { FaucetWorkers, IFaucetChildProcess } from '../../common/FaucetWorker.js';
import { ServiceManager } from '../../common/ServiceManager.js';
import { PromiseDfd } from '../../utils/PromiseDfd.js';
import { Socket } from 'node:net';
import { FaucetSession } from '../../session/FaucetSession.js';
import { IPoWConfig } from './PoWConfig.js';
import { PoWModule } from './PoWModule.js';
import { FaucetLogLevel, FaucetProcess } from '../../common/FaucetProcess.js';

export class PoWServer {
  private module: PoWModule;
  private serverId: string;
  private worker: IFaucetChildProcess;
  private readyDfd: PromiseDfd<void>;
  private shutdownDfd: PromiseDfd<void>;
  private sessions: {[sessionId: string]: FaucetSession} = {};

  public constructor(module: PoWModule, serverId: string, worker?: IFaucetChildProcess) {
    this.module = module;
    this.serverId = serverId;
    this.worker = worker || ServiceManager.GetService(FaucetWorkers).createChildProcess("pow-server");
    this.worker.childProcess.on("message", this.onMessage.bind(this));
    this.worker.childProcess.on("close", () => this.shutdownDfd.resolve());
    this.readyDfd = new PromiseDfd<void>();
    this.shutdownDfd = new PromiseDfd<void>();
  }

  public getServerId(): string {
    return this.serverId;
  }

  private sendMessage(message: any) {
    this.worker.childProcess.send(message);
  }

  private onMessage(message: any, handle?: any) {
    switch(message.action) {
      case "init":
        this.sendMessage({
          action: "pow-update-config",
          config: this.module.getModuleConfig(),
        });
        this.readyDfd.resolve();
        break;
      case "pow-session-abort":
        this.onSessionAbort(message.sessionId, message.type, message.reason, message.dirtyProps);
        break;
      case "pow-session-reward":
        this.onSessionReward(message.sessionId, message.reqId, BigInt(message.amount), message.dirtyProps);
        break;
    }
  }

  private async onSessionAbort(sessionId: string, type: string, reason: string, dirtyProps: {[key: string]: any}) {
    let session = this.sessions[sessionId];
    if(!session)
      return;

    for(let key in dirtyProps) {
      session.setSessionData(key, dirtyProps[key]);
    }

    switch(type) {
      case "slashed":
        session.setDropAmount(0n);
        session.setSessionFailed("SLASHED", reason);
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "session slashed: " + session.getSessionId());
        break;
      case "timeout":
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "session idle timeout: " + session.getSessionId());
        break;
    }

    delete this.sessions[sessionId];
    this.module.processPoWSessionClose(session);

    let sessionInfo = await session.getSessionInfo();
    this.sendMessage({
      action: "pow-session-close",
      sessionId: sessionId,
      info: sessionInfo,
    });
  }

  private onSessionReward(sessionId: string, reqId: number, amount: bigint, dirtyProps: {[key: string]: any}) {
    let session = this.sessions[sessionId];
    if(!session)
      return;

    for(let key in dirtyProps) {
      session.setSessionData(key, dirtyProps[key]);
    }

    let rewardPromise: Promise<bigint>;
    if(amount < 0n) {
      rewardPromise = session.subPenalty(amount);
    } else {
      rewardPromise = session.addReward(amount);
    }

    rewardPromise.then((amount) => {
      let balance = session.getDropAmount().toString();
      this.sendMessage({
        action: "pow-session-reward",
        sessionId: sessionId,
        reqId: reqId,
        amount: amount.toString(),
        balance: balance,
      });
    });
  }

  public getSessionCount(): number {
    return Object.keys(this.sessions).length;
  }

  public getReadyPromise(): Promise<void> {
    return this.readyDfd.promise;
  }

  public async shutdown() {
    this.sendMessage({
      action: "pow-shutdown",
    });

    let shutdownTimeout = setTimeout(() => {
      this.worker.controller.abort();
    }, 5000);

    await this.shutdownDfd.promise;
    clearTimeout(shutdownTimeout);
  }

  public updateConfig(config: IPoWConfig) {
    this.sendMessage({
      action: "pow-update-config",
      config: config,
    });
  }

  public registerSession(session: FaucetSession) {
    let sessionId = session.getSessionId();
    this.sessions[sessionId] = session;
    this.sendMessage({
      action: "pow-register-session",
      sessionId: sessionId,
      data: {
        "_startTime": session.getStartTime(),
        "_balance": session.getDropAmount().toString(),
        "pow.idleTime": session.getSessionData("pow.idleTime"),
        "pow.lastNonce": session.getSessionData("pow.lastNonce"),
        "pow.shareCount": session.getSessionData("pow.shareCount"),
        "pow.hashrates": session.getSessionData("pow.hashrates"),
        "pow.hashrate": session.getSessionData("pow.hashrate"),
        "pow.preimage": session.getSessionData("pow.preimage"),
      }
    });
  }

  public destroySession(sessionId: string) {
    let session = this.sessions[sessionId];
    if(!session)
      return;

    this.sendMessage({
      action: "pow-destroy-session",
      sessionId: sessionId,
    });

    delete this.sessions[sessionId];
  }

  public async connect(sessionId: string, req: http.IncomingMessage, socket: Socket, head: Buffer) {
    socket.pause();
    socket.removeAllListeners();

    await this.readyDfd.promise;

    this.worker.childProcess.send({
      action: "pow-connect",
      sessionId: sessionId,
      url: req.url,
      method: req.method,
      headers: req.headers,
      head: head.toString('base64'),
    }, socket, {
      keepOpen: true
    });

    socket.destroy();
  }
}


