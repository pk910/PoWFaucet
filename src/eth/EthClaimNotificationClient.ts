import { WebSocket } from 'ws';
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";

export interface IEthClaimNotificationData {
  processedIdx: number;
  confirmedIdx: number;
}

export class EthClaimNotificationClient {
  public static cfgPingInterval = 30;
  public static cfgPingTimeout = 120;

  private static activeClients: EthClaimNotificationClient[] = [];
  private static lastNotificationData: IEthClaimNotificationData;

  public static broadcastClaimNotification(data: IEthClaimNotificationData) {
    this.lastNotificationData = data;
    for(let i = this.activeClients.length - 1; i >= 0; i--) {
      this.activeClients[i].sendClaimNotification(data);
    }
  }

  public static resetClaimNotification() {
    this.lastNotificationData = null;
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
      this.socket?.pong(data)
    });
    this.socket.on("pong", (data) => {
      this.lastPingPong = new Date();
    });
    this.socket.on("error", (err) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "WebSocket error: " + err.toString());
      try {
        this.socket?.close();
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
    try {
      this.sendMessage("error", {
        reason: reason,
      });
      this.socket?.close();
    } catch(ex) {}
    this.dispose();
  }

  private pingClientLoop() {
    this.pingTimer = setInterval(() => {
      let pingpongTime = Math.floor(((new Date()).getTime() - this.lastPingPong.getTime()) / 1000);
      if(pingpongTime > EthClaimNotificationClient.cfgPingTimeout) {
        this.killClient("ping timeout");
        return;
      }
      
      this.socket?.ping();
    }, EthClaimNotificationClient.cfgPingInterval * 1000);
  }

  private sendMessage(action: string, data: any) {
    this.socket?.send(JSON.stringify({
      action: action,
      data: data,
    }));
  }

  private sendClaimNotification(data: IEthClaimNotificationData) {
    this.sendMessage("update", data);
    if(data.confirmedIdx >= this.claimIdx) {
      this.killClient("claim confirmed");
    }
  }

}
