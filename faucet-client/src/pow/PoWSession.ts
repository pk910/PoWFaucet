import { TypedEmitter } from 'tiny-typed-emitter';
import { PoWClient } from "./PoWClient";
import { IPoWMinerShare, IPoWMinerVerification, IPoWMinerVerificationResult, PoWMiner } from "./PoWMiner";
import { FaucetTime } from '../common/FaucetTime';
import { FaucetSession } from '../common/FaucetSession';
import { getPoWParamsStr } from '../utils/PoWParamsHelper';
import { IFaucetConfig, IPoWModuleConfig } from '../common/FaucetConfig';

export interface IPoWSessionOptions {
  session: FaucetSession;
  client: PoWClient;
  time: FaucetTime;
  showNotification: (type: string, message: string, time?: number|boolean, timeout?: number) => number;
  refreshConfig: () => void;
}

export interface IPoWSessionBalanceUpdate {
  balance: number;
  reason: string;
}

interface PoWSessionEvents {
  'resume': () => void;
  'balanceUpdate': (update: IPoWSessionBalanceUpdate) => void;
  'error': (message: string) => void;
  'close': (data: any) => void;
}

export class PoWSession extends TypedEmitter<PoWSessionEvents> {
  private options: IPoWSessionOptions;
  private miner: PoWMiner;
  private preImage: string;
  private lastNonce: number;
  private shareCount: number;
  private balance: bigint;
  private shareQueue: IPoWMinerShare[];
  private shareQueueProcessing: boolean;
  private verifyResultQueue: IPoWMinerVerificationResult[];

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
    })
    this.options.client.on("verify", (message) => this.processVerification(message.data));
    this.options.client.on("updateBalance", (message) => this.updateBalance(message.data));
    this.options.client.on("error", (message) => {
      this.options.showNotification("error", "WS Error: [" + message.data.code + "] " + message.data.message, true, 20 * 1000);
      this.emit("error", message);
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
    if(this.options.client.isReady() && this.shareQueue.length === 0)
      this._submitShare(share);
    else
      this.shareQueue.push(share);
    this.shareCount++;
  }

  private processShareQueue() {
    if(this.shareQueueProcessing)
      return;
    this.shareQueueProcessing = true;

    let queueLoop = () => {
      let queueLen = this.shareQueue.length;
      if(!this.options.client.isReady())
        queueLen = 0;
      
      if(queueLen > 0) {
        this._submitShare(this.shareQueue.shift());
        queueLen--;
      }

      if(queueLen > 0)
        setTimeout(() => queueLoop(), 2000);
      else
        this.shareQueueProcessing = false;
    }
    queueLoop();
  }

  private _submitShare(share: IPoWMinerShare) {
    this.options.client.sendRequest("foundShare", share).catch((err) => {
      if(err.code === "INVALID_SHARE" && err.message === "Invalid share params") {
        this.shareQueue = this.shareQueue.filter((s) => s.params !== share.params);
        this.options.refreshConfig();
        return; // Ignore invalid params
      }

      this.options.showNotification("error", "Submission error: [" + err.code + "] " + err.message, true, 20 * 1000);
    });
  }

  private processVerification(verification: IPoWMinerVerification) {
    this.miner.processVerification(verification);
  }

  public submitVerifyResult(result: IPoWMinerVerificationResult) {
    if(this.options.client.isReady() && this.verifyResultQueue.length === 0)
      this._submitVerifyResult(result);
    else
      this.verifyResultQueue.push(result);
  }

  private processVerifyQueue() {
    this.verifyResultQueue.forEach((result) => this._submitVerifyResult(result));
  }

  private _submitVerifyResult(result: IPoWMinerVerificationResult) {
    this.options.client.sendRequest("verifyResult", result).catch((err) => {
      if(err.code === "INVALID_VERIFYRESULT" && err.message === "Invalid share params") {
        this.verifyResultQueue = this.verifyResultQueue.filter((s) => s.params !== result.params);
        this.options.refreshConfig();
        return; // Ignore invalid params
      }

      this.options.showNotification("error", "Verification error: [" + err.code + "] " + err.message, true, 20 * 1000);
    });
  }

  public getBalance(): bigint {
    return this.balance;
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

}
