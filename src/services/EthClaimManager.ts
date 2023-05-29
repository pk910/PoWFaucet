import { TypedEmitter } from "tiny-typed-emitter";
import { faucetConfig } from "../common/FaucetConfig";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";
import { EthWalletManager } from "./EthWalletManager";
import { FaucetStatsLog } from "./FaucetStatsLog";
import { FaucetStoreDB } from "./FaucetStoreDB";
import { EthWalletRefill } from "./EthWalletRefill";

export enum ClaimTxStatus {
  QUEUE = "queue",
  PROCESSING = "processing",
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
}

export interface ClaimTxEvents {
  'processing': () => void;
  'pending': () => void;
  'confirmed': () => void;
  'failed': () => void;
}

export interface IQueuedClaimTx {
  time: number;
  target: string;
  amount: string;
  session: string;
}

export class ClaimTx extends TypedEmitter<ClaimTxEvents> {
  public queueIdx: number;
  public status: ClaimTxStatus;
  public readonly time: Date;
  public readonly target: string;
  public readonly amount: bigint;
  public readonly session: string;
  public nonce: number;
  public txhex: string;
  public txhash: string;
  public txblock: number;
  public txfee: bigint;
  public retryCount: number;
  public failReason: string;

  public constructor(target: string, amount: bigint, sessId: string, date?: number) {
    super();
    this.status = ClaimTxStatus.QUEUE;
    this.time = date ? new Date(date) : new Date();
    this.target = target;
    this.amount = amount;
    this.session = sessId;
    this.txfee = 0n;
    this.retryCount = 0;
  }

  public serialize(): IQueuedClaimTx {
    return {
      time: this.time.getTime(),
      target: this.target,
      amount: this.amount.toString(),
      session: this.session,
    };
  }
}

export class EthClaimManager {
  private initialized: boolean;
  private claimTxQueue: ClaimTx[] = [];
  private pendingTxQueue: {[hash: string]: ClaimTx} = {};
  private historyTxDict: {[nonce: number]: ClaimTx} = {};
  private queueProcessing: boolean = false;
  private lastClaimTxIdx: number = 1;
  private lastProcessedClaimTxIdx: number = 0;

  public initialize() {
    if(this.initialized)
      return;
    this.initialized = true;

    // restore saved claimTx queue
    ServiceManager.GetService(FaucetStoreDB).getClaimTxQueue().forEach((claimTx) => {
      let claim = new ClaimTx(claimTx.target, BigInt(claimTx.amount), claimTx.session, claimTx.time);
      claim.queueIdx = this.lastClaimTxIdx++;
      this.claimTxQueue.push(claim);
    });

    // start queue processing interval
    setInterval(() => this.processQueue(), 2000);
  }

  public getTransactionQueue(queueOnly?: boolean): ClaimTx[] {
    let txlist: ClaimTx[] = [];
    Array.prototype.push.apply(txlist, this.claimTxQueue);
    if(!queueOnly) {
      Array.prototype.push.apply(txlist, Object.values(this.pendingTxQueue));
      Array.prototype.push.apply(txlist, Object.values(this.historyTxDict));
    }
    return txlist;
  }

  public getQueuedAmount(): bigint | null {
    let totalPending = 0n;
    this.claimTxQueue.forEach((claimTx) => {
      totalPending += claimTx.amount;
    });
    return totalPending;
  }

  public getLastProcessedClaimIdx(): number {
    return this.lastProcessedClaimTxIdx;
  }

  public addClaimTransaction(target: string, amount: bigint, sessId: string): ClaimTx {
    let claimTx = new ClaimTx(target, amount, sessId);
    claimTx.queueIdx = this.lastClaimTxIdx++;
    this.claimTxQueue.push(claimTx);
    ServiceManager.GetService(FaucetStoreDB).addQueuedClaimTx(claimTx.serialize());
    return claimTx;
  }

  public getClaimTransaction(sessId: string): ClaimTx {
    for(let i = 0; i < this.claimTxQueue.length; i++) {
      if(this.claimTxQueue[i].session === sessId)
        return this.claimTxQueue[i];
    }
    
    let pendingTxs = Object.values(this.pendingTxQueue);
    for(let i = 0; i < pendingTxs.length; i++) {
      if(pendingTxs[i].session === sessId)
        return pendingTxs[i];
    }

    let historyTxs = Object.values(this.historyTxDict);
    for(let i = 0; i < historyTxs.length; i++) {
      if(historyTxs[i].session === sessId)
        return historyTxs[i];
    }

    return null;
  }

  private async processQueue() {
    if(this.queueProcessing)
      return;
    this.queueProcessing = true;

    try {
      let walletState = ServiceManager.GetService(EthWalletManager).getWalletState();
      while(Object.keys(this.pendingTxQueue).length < faucetConfig.ethMaxPending && this.claimTxQueue.length > 0) {
        if(faucetConfig.ethQueueNoFunds && (
          !walletState.ready || 
          walletState.balance - BigInt(faucetConfig.spareFundsAmount) < this.claimTxQueue[0].amount ||
          walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
        )) {
          break; // skip processing (out of funds)
        }

        let claimTx = this.claimTxQueue.splice(0, 1)[0];
        this.lastProcessedClaimTxIdx = claimTx.queueIdx;
        await this.processQueueTx(claimTx);
      }

      let now = Math.floor(new Date().getTime() / 1000);
      let walletRefreshTime = walletState.ready ? 600 : 10;
      if(Object.keys(this.pendingTxQueue).length === 0 && now - ServiceManager.GetService(EthWalletManager).getLastWalletRefresh() > walletRefreshTime) {
        await ServiceManager.GetService(EthWalletManager).loadWalletState();
      }

      if(faucetConfig.ethRefillContract && walletState.ready)
        await ServiceManager.GetService(EthWalletRefill).processWalletRefill();
    } catch(ex) {
      let stack;
      try {
        throw new Error();
      } catch(ex) {
        stack = ex.stack;
      }
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Exception in transaction queue processing: " + ex.toString() + `\r\n   Stack Trace: ${ex && ex.stack ? ex.stack : stack}`);
    }
    this.queueProcessing = false;
  }

  private async processQueueTx(claimTx: ClaimTx) {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let walletState = ethWalletManager.getWalletState();
    if(!walletState.ready) {
      claimTx.failReason = "Network RPC is currently unreachable.";
      claimTx.status = ClaimTxStatus.FAILED;
      claimTx.emit("failed");
      ServiceManager.GetService(FaucetStoreDB).removeQueuedClaimTx(claimTx.session);
      return;
    }
    if(
      !walletState.ready || 
      walletState.balance - BigInt(faucetConfig.spareFundsAmount) < claimTx.amount ||
      walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
    ) {
      claimTx.failReason = "Faucet wallet is out of funds.";
      claimTx.status = ClaimTxStatus.FAILED;
      claimTx.emit("failed");
      ServiceManager.GetService(FaucetStoreDB).removeQueuedClaimTx(claimTx.session);
      return;
    }

    try {
      claimTx.status = ClaimTxStatus.PROCESSING;
      claimTx.emit("processing");

      // send transaction
      let { txPromise } = await ethWalletManager.sendClaimTx(claimTx);
      this.pendingTxQueue[claimTx.txhash] = claimTx;
      ServiceManager.GetService(FaucetStoreDB).removeQueuedClaimTx(claimTx.session);
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Submitted claim transaction " + claimTx.session + " [" + ethWalletManager.readableAmount(claimTx.amount) + "] to: " + claimTx.target + ": " + claimTx.txhash);
      claimTx.status = ClaimTxStatus.PENDING;
      claimTx.emit("pending");

      // await transaction receipt
      txPromise.then((txData) => {
        delete this.pendingTxQueue[claimTx.txhash];
        claimTx.txblock = txData.block;
        claimTx.txfee = txData.fee;
        claimTx.status = ClaimTxStatus.CONFIRMED;
        claimTx.emit("confirmed");
        ServiceManager.GetService(FaucetStatsLog).addClaimStats(claimTx);
      }, (error) => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Transaction for " + claimTx.target + " failed: " + error.toString());
        delete this.pendingTxQueue[claimTx.txhash];
        claimTx.failReason = "Transaction Error: " + error.toString();
        claimTx.status = ClaimTxStatus.FAILED;
        claimTx.emit("failed");
      }).then(() => {
        this.historyTxDict[claimTx.nonce] = claimTx;
        setTimeout(() => {
          delete this.historyTxDict[claimTx.nonce];
        }, 30 * 60 * 1000);
      });
    } catch(ex) {
      claimTx.failReason = "Processing Exception: " + ex.toString();
      claimTx.status = ClaimTxStatus.FAILED;
      claimTx.emit("failed");
    }
  }

}
