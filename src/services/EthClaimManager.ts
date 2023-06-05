import { TransactionReceipt } from 'web3-core';
import { faucetConfig } from "../config/FaucetConfig";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";
import { EthWalletManager, TransactionResult } from "./EthWalletManager";
import { FaucetStatsLog } from "./FaucetStatsLog";
import { FaucetStoreDB } from "./FaucetStoreDB";
import { EthWalletRefill } from "./EthWalletRefill";
import { FaucetSession } from "../session/FaucetSession";
import { SessionManager } from "../session/SessionManager";

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

export class ClaimTx {
  public static getClaimTx(session: FaucetSession): ClaimTx {
    let claimTx: ClaimTx;
    if(!(claimTx = session.getSessionModuleRef("claim.txref"))) {
      claimTx = new ClaimTx(session);
      session.setSessionModuleRef("claim.txref", claimTx);
    }
    return claimTx;
  }

  private session: FaucetSession;
  
  private constructor(session: FaucetSession) {
    this.session = session;
  }

  public setFailed(reason: string) {
    this.session.setSessionFailed("CLAIM_FAILED", reason);
  }

  public setStatus(status: ClaimTxStatus) {
    this.session.setSessionData("claim.status", status);
    this.session.notifyClaimStatus(this);
  }

  public get amount(): bigint { return this.session.getDropAmount(); }
  public get targetAddr(): string { return this.session.getTargetAddr(); }
  public get sessionId(): string { return this.session.getSessionId(); }

  public get queueIdx(): number { return this.session.getSessionData("claim.queueIdx") || 0; }
  public set queueIdx(value: number) { this.session.setSessionData("claim.queueIdx", value); }

  public get claimStatus(): ClaimTxStatus { return this.session.getSessionData("claim.status"); }

  public get txhash(): string { return this.session.getSessionData("claim.txhash"); }
  public set txhash(value: string) { this.session.setSessionData("claim.txhash", value); }

  public get txnonce(): number { return this.session.getSessionData("claim.txnonce"); }
  public set txnonce(value: number) { this.session.setSessionData("claim.txnonce", value); }

  public get txblock(): number { return this.session.getSessionData("claim.txblock"); }
  public set txblock(value: number) { this.session.setSessionData("claim.txblock", value); }

  public get txfee(): bigint { return BigInt(this.session.getSessionData("claim.txfee")); }
  public set txfee(value: bigint) { this.session.setSessionData("claim.txfee", value.toString()); }

  public get txhex(): string { return this.session.getSessionModuleRef("claim.txhex"); }
  public set txhex(value: string) { this.session.setSessionModuleRef("claim.txhex", value); }
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
    let maxQueueIdx = 0;
    ServiceManager.GetService(SessionManager).getClaimingSessions().forEach((session) => {
      let claimTx = ClaimTx.getClaimTx(session);
      switch(claimTx.claimStatus) {
        case ClaimTxStatus.QUEUE:
        case ClaimTxStatus.PROCESSING:
          this.claimTxQueue.push(claimTx);
          break;
        case ClaimTxStatus.PENDING:
          this.pendingTxQueue[claimTx.txhash] = claimTx;
          this.awaitTxReceipt(claimTx, ServiceManager.GetService(EthWalletManager).watchClaimTx(claimTx));
          break;
        default:
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Cannot restore claimTx: unexpected claim status '" + claimTx.claimStatus + "'");
          return;
      }
      if(claimTx.queueIdx > maxQueueIdx)
        maxQueueIdx = claimTx.queueIdx;
    });
    this.claimTxQueue.sort((a, b) => a.queueIdx - b.queueIdx);
    this.lastClaimTxIdx = maxQueueIdx + 1;

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

  public createSessionClaim(session: FaucetSession): ClaimTx {
    let claimTx = ClaimTx.getClaimTx(session);
    claimTx.queueIdx = this.lastClaimTxIdx++;
    claimTx.setStatus(ClaimTxStatus.QUEUE);
    this.claimTxQueue.push(claimTx);
    return claimTx;
  }

  public async processQueue() {
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
      claimTx.setFailed("Network RPC is currently unreachable.");
      return;
    }
    if(
      !walletState.ready || 
      walletState.balance - BigInt(faucetConfig.spareFundsAmount) < claimTx.amount ||
      walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
    ) {
      claimTx.setFailed("Faucet wallet is out of funds.");
      return;
    }

    try {
      claimTx.setStatus(ClaimTxStatus.PROCESSING);

      // send transaction
      let { txPromise } = await ethWalletManager.sendClaimTx(claimTx);
      this.pendingTxQueue[claimTx.txhash] = claimTx;
      
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Submitted claim transaction " + claimTx.sessionId + " [" + ethWalletManager.readableAmount(claimTx.amount) + "] to: " + claimTx.targetAddr + ": " + claimTx.txhash);
      claimTx.setStatus(ClaimTxStatus.PENDING);

      this.awaitTxReceipt(claimTx, txPromise);
    } catch(ex) {
      claimTx.setFailed("Processing Exception: " + ex.toString());
    }
  }

  private awaitTxReceipt(claimTx: ClaimTx, txPromise: Promise<{
    status: boolean;
    block: number;
    fee: bigint;
    receipt: TransactionReceipt;
  }>) {
    // await transaction receipt
    txPromise.then((txData) => {
      delete this.pendingTxQueue[claimTx.txhash];
      claimTx.txblock = txData.block;
      claimTx.txfee = txData.fee;
      claimTx.setStatus(ClaimTxStatus.CONFIRMED);
      ServiceManager.GetService(FaucetStatsLog).addClaimStats(claimTx);
    }, (error) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Transaction for " + claimTx.targetAddr + " failed: " + error.toString());
      delete this.pendingTxQueue[claimTx.txhash];
      claimTx.setFailed("Transaction Error: " + error.toString());
    }).then(() => {
      this.historyTxDict[claimTx.txnonce] = claimTx;
      setTimeout(() => {
        delete this.historyTxDict[claimTx.txnonce];
      }, 30 * 60 * 1000);
    });
  }

}
