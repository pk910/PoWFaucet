import { TypedEmitter } from 'tiny-typed-emitter';
import { PromiseDfd } from "../utils/PromiseDfd";
import { IFaucetConfig, IFaucetStatus } from '../common/FaucetConfig';


export interface IPoWClientOptions {
  powApiUrl: string;
  sessionId: string;
}

interface PoWClientEvents {
  'open': () => void;
  'close': () => void;
  [command: string]: (message: any) => void;
}

enum PoWClientStatus {
  CLOSED_IDLE = 0,
  CLOSED_RECONNECT = 1,
  CONNECTING = 2,
  READY = 3,
}

export class PoWClient extends TypedEmitter<PoWClientEvents> {
  private options: IPoWClientOptions;
  private clientSocket: WebSocket;
  private clientStatus: PoWClientStatus;
  private readyDfd: PromiseDfd<void>;
  private requestCounter: number = 1;
  private reconnectTimer: NodeJS.Timeout;
  private disconnectTimer: NodeJS.Timeout;
  private requestQueue: {[id: number]: PromiseDfd<any>} = {};

  public constructor(options: IPoWClientOptions) {
    super();
    this.options = options;
    this.clientStatus = PoWClientStatus.CLOSED_IDLE;
  }

  public start() {
    this.clientStatus =PoWClientStatus.CLOSED_RECONNECT;
    this.startClient();
  }

  public stop() {
    if(this.clientSocket) {
      this.clientSocket.close();
      this.clientSocket = null;
    }
    this.clientStatus =PoWClientStatus.CLOSED_IDLE;
  }

  public isReady(): boolean {
    return this.clientStatus === PoWClientStatus.READY;
  }

  public getReadyPromise(): Promise<void> {
    if(this.clientStatus === PoWClientStatus.READY)
      return Promise.resolve();
    if(!this.readyDfd)
      this.readyDfd = new PromiseDfd<void>();
    return this.readyDfd.promise;
  }

  private startClient() {
    this.clientStatus = PoWClientStatus.CONNECTING;
    this.clientSocket = new WebSocket(this.options.powApiUrl + "?session=" + this.options.sessionId);
    this.clientSocket.addEventListener("open", (evt) => {
      console.log("[PoWClient] faucet websocket opened");
      this.clientStatus = PoWClientStatus.READY;
      this.onClientReady();
    });
    this.clientSocket.addEventListener("close", (evt) => {
      console.log("[PoWClient] faucet websocket closed");
      this.onClientClose();
    });
    this.clientSocket.addEventListener("error", (evt) => {
      console.log("[PoWClient] faucet websocket error", evt);
      this.onClientClose();
    });
    this.clientSocket.addEventListener("message", (evt) => this.onClientMessage(evt));
  }

  private reconnectClient() {
    if(this.reconnectTimer)
      return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.startClient();
    }, (5 * 1000) + (1000 * 5 * Math.random()));
  }

  private onClientClose() {
    this.clientSocket = null;
    if(this.clientStatus !== PoWClientStatus.CLOSED_IDLE)
      this.clientStatus = PoWClientStatus.CLOSED_RECONNECT;
    if(this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    this.emit("close");
    if(this.clientStatus === PoWClientStatus.CLOSED_RECONNECT)
      this.reconnectClient();
  }

  public sendRequest<T = any>(action: string, data?: any): Promise<T> {
    if(this.clientStatus === PoWClientStatus.CLOSED_IDLE)
      return Promise.reject("Internal Error (sendRequest called without active client). Please report this issue on github.");
    if(this.clientStatus === PoWClientStatus.CLOSED_RECONNECT)
      return Promise.reject("Not connected to faucet server. Please check your internet connection and try again in a few seconds.");

    let readyPromise: Promise<void>; 
    if(this.clientStatus !== PoWClientStatus.READY)
      readyPromise = this.getReadyPromise();
    else
      readyPromise = Promise.resolve();

    return readyPromise.then(() => this._sendRequest(action, data));
  }

  private _sendRequest<T = any>(action: string, data?: any): Promise<T> {
    var requestId = this.requestCounter++;
    var reqDfd = this.requestQueue[requestId] = new PromiseDfd<T>();
    var message: any = {
      id: requestId,
      action: action
    };
    if(data !== undefined)
      message.data = data;

    this.clientSocket.send(JSON.stringify(message));

    return reqDfd.promise;
  }

  public sendMessage(action: string, data?: object) {
    var message: any = {
      action: action
    };
    if(data !== undefined)
      message.data = data;

    this.clientSocket.send(JSON.stringify(message));
  }

  private onClientMessage(evt: MessageEvent) {
    var message;
    try {
      message = JSON.parse(evt.data);
    } catch(ex) {
      console.error(ex);
      return;
    }

    if(message.hasOwnProperty("rsp")) {
      var rspId = message.rsp;
      var isOk = (message.action !== "error");
      if(this.requestQueue.hasOwnProperty(rspId)) {
        if(isOk)
          this.requestQueue[rspId].resolve(message.data);
        else
          this.requestQueue[rspId].reject(message.data);
        delete this.requestQueue[rspId];
      }
      return;
    }

    if(message.action) {
      this.emit(message.action, message);
    }
  }

  private onClientReady() {
    if(this.readyDfd) {
      this.readyDfd.resolve();
      this.readyDfd = null;
    }
    if(!this.disconnectTimer) {
      this.disconnectTimer = setTimeout(() => {
        this.disconnectTimer = null;
        // reconnect after 24h
        if(this.clientSocket) {
          this.clientSocket.close(1000, "24h reconnect");
        }
      }, 60 * 60 * 24 * 1000);
    }
    this.emit("open");
  }

}
