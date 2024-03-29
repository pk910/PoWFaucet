import { TypedEmitter } from 'tiny-typed-emitter';
import { PoWClient } from "./PoWClient";
import { IPoWMinerShare, IPoWMinerVerification, PoWMiner } from "./PoWMiner";
import { FaucetTime } from '../common/FaucetTime';
import { FaucetSession } from '../common/FaucetSession';

export interface IPoWSessionOptions {
  session: FaucetSession;
  client: PoWClient;
  time: FaucetTime;
  showNotification: (
      type: string,
      message: string,
      time?: number | boolean,
      timeout?: number
  ) => number;
}

export interface IPoWSessionBalanceUpdate {
  balance: number;
  reason: string;
}

interface PoWSessionEvents {
  resume: () => void;
  balanceUpdate: (update: IPoWSessionBalanceUpdate) => void;
  error: (message: string) => void;
  close: (data: any) => void;
}

export class PoWSession extends TypedEmitter<PoWSessionEvents> {
  public balance: bigint | undefined;
  private options: IPoWSessionOptions;
  private miner: PoWMiner | undefined;
  private preImage = "";
  private lastNonce: number = 0;
  private shareCount = 0;
  private shareQueue: IPoWMinerShare[] | undefined;
  private shareQueueProcessing: boolean | undefined;
  private verifyResultQueue: any[] | undefined;

  public constructor(options: IPoWSessionOptions) {
    super();
    this.options = options;
  }

  public resumeSession() {
    this.shareQueue = [];
    this.verifyResultQueue = [];

    let sessionState = this.options.session.getModuleState("pow");
    this.preImage = sessionState.preImage;
    this.lastNonce = sessionState.lastNonce + 1;
    this.shareCount = sessionState.shareCount;
    this.balance = this.options.session.getDropAmount();

    this.options.client.on("open", () => {
      this.processShareQueue();
      this.processVerifyQueue();
    });
    this.options.client.on("verify", (message) =>
        this.processVerification(message.data)
    );
    this.options.client.on("updateBalance", (message) =>
        this.updateBalance(message.data)
    );
    this.options.client.on("error", (message) => {
      if (message.data.code === "CLIENT_KILLED") {
        this.options.client.stop();
      } else {
        this.options.showNotification(
            "error",
            "WS Error: [" + message.data.code + "] " + message.data.message,
            true,
            20 * 1000
        );
      }
      // this.emit("error", message);
    });

    this.emit("resume");
  }

  public setMiner(miner: PoWMiner) {
    this.miner = miner;
  }

  public closeSession() {
    return this.options.client.sendRequest("closeSession").then((data) => {
      this.emit("close", data);
    });
  }

  public submitShare(share: IPoWMinerShare) {
    if (this.options.client.isReady() && this.shareQueue?.length === 0) {
      this._submitShare(share);
    } else {
      this.shareQueue?.push(share);
    }
    this.shareCount++;
  }

  public submitVerifyResult(result: any) {
    if (this.options.client.isReady() && this.verifyResultQueue?.length === 0) {
      this._submitVerifyResult(result);
    } else {
      this.verifyResultQueue?.push(result);
    }
  }

  public getBalance(): bigint {
    return this.balance ?? BigInt(0);
  }

  public updateBalance(balanceUpdate: IPoWSessionBalanceUpdate) {
    this.balance = BigInt(balanceUpdate.balance);
    this.emit("balanceUpdate", balanceUpdate);
  }

  public getNonceRange(count: number): number {
    let noncePos = this.lastNonce;
    this.lastNonce += count;
    return noncePos;
  }

  public getLastNonce(): number {
    return this.lastNonce;
  }

  public getShareCount(): number {
    return this.shareCount;
  }

  public getPreImage(): string {
    return this.preImage;
  }

  public getTargetAddr(): string {
    return this.options.session.getTargetAddr();
  }

  public getStartTime(): number {
    return this.options.session.getStartTime();
  }

  private processShareQueue() {
    if (this.shareQueueProcessing) {
      return;
    }
    this.shareQueueProcessing = true;

    let queueLoop = () => {
      let queueLen = this.shareQueue?.length ?? 0;
      if (!this.options.client.isReady()) {
        queueLen = 0;
      }

      if (queueLen > 0) {
        this._submitShare(this.shareQueue?.shift() as IPoWMinerShare);
        queueLen--;
      }

      if (queueLen > 0) {
        setTimeout(() => queueLoop(), 2000);
      } else {
        this.shareQueueProcessing = false;
      }
    };
    queueLoop();
  }

  private _submitShare(share: IPoWMinerShare) {
    this.options.client.sendRequest("foundShare", share).catch((err) => {
      this.options.showNotification(
          "error",
          "Submission error: [" + err.code + "] " + err.message,
          true,
          20 * 1000
      );
    });
  }

  private processVerification(verification: IPoWMinerVerification) {
    this.miner?.processVerification(verification);
  }

  private processVerifyQueue() {
    this.verifyResultQueue?.forEach((result) =>
        this._submitVerifyResult(result)
    );
  }

  private _submitVerifyResult(result: any) {
    this.options.client.sendRequest("verifyResult", result).catch((err) => {
      this.options.showNotification(
          "error",
          "Verification error: [" + err.code + "] " + err.message,
          true,
          20 * 1000
      );
    });
  }
}
