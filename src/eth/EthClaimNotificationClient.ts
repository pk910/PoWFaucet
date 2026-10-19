import { WebSocket } from 'ws';
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";

/** the queue's progress, the same for every socket */
export interface IEthClaimNotificationData {
  /** the queue has been processed up to this claim index: every claim up to here was sent, or failed before sending */
  processedIdx: number;
  /**
   * every claim up to this index is settled: confirmed or failed, with its session's status
   * written. Receipts are observed in any order, so the claim confirmed last may lie far beyond
   * it while an earlier transaction is still pending; `settled` is the word for one socket's claim.
   */
  confirmedIdx: number;
}

/** what one socket gets: the queue's progress, and whether its own claim is settled */
export interface IEthClaimNotificationMessage extends IEthClaimNotificationData {
  settled: boolean;
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
  private pingTimer: NodeJS.Timeout = null;
  private lastPingPong: Date;
  private claimIdx: number;
  private isSettled: () => boolean;

  public constructor(socket: WebSocket, claimIdx: number, isSettled: () => boolean) {
    this.socket = socket;
    this.claimIdx = claimIdx;
    this.isSettled = isSettled;
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

  /** the queue's progress with this socket's own verdict; a settled claim ends the socket, its page asks for the final status once */
  private sendClaimNotification(data: IEthClaimNotificationData) {
    let message: IEthClaimNotificationMessage = {
      ...data,
      settled: data.confirmedIdx >= this.claimIdx || this.isSettled(),
    };
    this.sendMessage("update", message);
    if(message.settled) {
      this.killClient("claim settled");
    }
  }

}
