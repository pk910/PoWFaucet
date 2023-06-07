import { WebSocket } from 'ws';
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";

export interface IEthClaimNotificationData {
  processedIdx: number;
  confirmedIdx: number;
}

export class EthClaimNotificationClient {
  private static activeClients: EthClaimNotificationClient[] = [];
  private static lastNotificationData: IEthClaimNotificationData;

  public static broadcastClaimNotification(data: IEthClaimNotificationData) {
    this.lastNotificationData = data;
    this.activeClients.forEach((client) => client.sendClaimNotification(data));
  }

  private socket: WebSocket;
  private pingTimer: NodeJS.Timer = null;
  private lastPingPong: Date;
  private claimIdx: number;

  public constructor(socket: WebSocket, claimIdx: number) {
    this.socket = socket;
    this.claimIdx = claimIdx;
    this.lastPingPong = new Date();

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
      this.dispose();
    });
    this.socket.on("close", () => {
      this.dispose();
    });
    this.pingClientLoop();
    EthClaimNotificationClient.activeClients.push(this);

    if(EthClaimNotificationClient.lastNotificationData) {
      this.sendClaimNotification(EthClaimNotificationClient.lastNotificationData);
    }
  }

  public isReady(): boolean {
    return !!this.socket;
  }

  private dispose() {
    this.socket = null;

    if(this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }

    let clientIdx = EthClaimNotificationClient.activeClients.indexOf(this);
    if(clientIdx !== -1) {
      EthClaimNotificationClient.activeClients.splice(clientIdx, 1);
    }
  }

  public killClient(reason?: string) {
    if(!this.socket)
      return;
    try {
      this.sendMessage("error", {
        reason: reason,
      });
      this.socket.close();
    } catch(ex) {}
    this.dispose();
  }

  private pingClientLoop() {
    this.pingTimer = setInterval(() => {
      if(!this.socket)
        return;
      
      let pingpongTime = Math.floor(((new Date()).getTime() - this.lastPingPong.getTime()) / 1000);
      if(pingpongTime > 120) {
        this.killClient("ping timeout");
        return;
      }
      
      this.socket.ping();
    }, 60 * 1000);
  }

  private sendMessage(action: string, data?: any, rsp?: any) {
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

  private sendClaimNotification(data: IEthClaimNotificationData) {
    this.sendMessage("update", data);
    if(data.confirmedIdx >= this.claimIdx) {
      this.killClient("claim confirmed");
    }
  }

}
