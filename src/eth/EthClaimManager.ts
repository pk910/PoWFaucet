import { TransactionReceipt } from 'web3-core';
import { WebSocket } from 'ws';
import { faucetConfig } from "../config/FaucetConfig";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess";
import { ServiceManager } from "../common/ServiceManager";
import { EthWalletManager } from "./EthWalletManager";
import { FaucetStatsLog } from "../services/FaucetStatsLog";
import { FaucetDatabase } from "../db/FaucetDatabase";
import { EthWalletRefill } from "./EthWalletRefill";
import { FaucetSessionStatus, FaucetSessionStoreData } from "../session/FaucetSession";
import { FaucetError } from '../common/FaucetError';
import { ModuleHookAction, ModuleManager } from '../modules/ModuleManager';
import { FaucetHttpServer } from '../webserv/FaucetHttpServer';
import { IncomingMessage } from 'http';
import { EthClaimNotificationClient, IEthClaimNotificationData } from './EthClaimNotificationClient';
import { FaucetOutflowModule } from '../modules/faucet-outflow/FaucetOutflowModule';
import { clearInterval } from 'timers';

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

export interface EthClaimInfo {
  session: string;
  target: string;
  amount: string;
  claim: EthClaimData;
}

export interface EthClaimData {
  claimIdx: number;
  claimStatus: ClaimTxStatus;
  claimTime: number,
  txHash?: string;
  txHex?: string;
  txNonce?: number;
  txBlock?: number;
  txFee?: string;
  txError?: string;
}

export class EthClaimManager {
  private initialized: boolean;
  private queueInterval: NodeJS.Timer;
  private claimTxDict: {[session: string]: EthClaimInfo} = {};
  private claimTxQueue: EthClaimInfo[] = [];
  private pendingTxQueue: {[hash: string]: EthClaimInfo} = {};
  private historyTxDict: {[nonce: number]: EthClaimInfo} = {};
  private queueProcessing: boolean = false;
  private lastClaimTxIdx: number = 1;
  private lastProcessedClaimTxIdx: number = 0;
  private lastConfirmedClaimTxIdx: number = 0;
  private lastClaimNotification: IEthClaimNotificationData;

  public async initialize(): Promise<void> {
    if(this.initialized)
      return;
    this.initialized = true;

    // restore saved claimTx queue
    let maxQueueIdx = 0;
    let storedSession = await  ServiceManager.GetService(FaucetDatabase).getSessions([
      FaucetSessionStatus.CLAIMING,
    ]);
    storedSession.forEach((sessionData) => {
      let claimInfo: EthClaimInfo = {
        session: sessionData.sessionId,
        target: sessionData.targetAddr,
        amount: sessionData.dropAmount,
        claim: sessionData.claim,
      };
      switch(claimInfo.claim.claimStatus) {
        case ClaimTxStatus.QUEUE:
        case ClaimTxStatus.PROCESSING:
          this.claimTxQueue.push(claimInfo);
          this.claimTxDict[claimInfo.session] = claimInfo;
          break;
        case ClaimTxStatus.PENDING:
          this.pendingTxQueue[claimInfo.claim.txHash] = claimInfo;
          this.claimTxDict[claimInfo.session] = claimInfo;
          this.awaitTxReceipt(claimInfo, ServiceManager.GetService(EthWalletManager).watchClaimTx(claimInfo));
          break;
        default:
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Cannot restore claimTx: unexpected claim status '" + claimInfo.claim.claimStatus + "'");
          return;
      }
      if(claimInfo.claim.claimIdx > maxQueueIdx)
        maxQueueIdx = claimInfo.claim.claimIdx;
    });

    this.claimTxQueue.sort((a, b) => a.claim.claimIdx - b.claim.claimIdx);
    this.lastClaimTxIdx = maxQueueIdx + 1;

    // register claim ws endpoint
    ServiceManager.GetService(FaucetHttpServer).addWssEndpoint("claim", /^\/ws\/claim($|\?)/, (req, ws, ip) => this.processClaimNotificationWebSocket(req, ws, ip));

    // start queue processing interval
    this.queueInterval = setInterval(() => this.processQueue(), 2000);
  }

  public dispose() {
    if(!this.initialized)
      return;
    this.initialized = false;
    
    EthClaimNotificationClient.resetClaimNotification();
    clearInterval(this.queueInterval);
  }

  private async processClaimNotificationWebSocket(req: IncomingMessage, ws: WebSocket, remoteIp: string) {
    let sessionId: string;
    try {
      let urlParts = req.url.split("?");
      let url = new URLSearchParams(urlParts[1]);
      sessionId = url.get("session");
    
      let sessionInfo: FaucetSessionStoreData
      if(!sessionId || !(sessionInfo = await ServiceManager.GetService(FaucetDatabase).getSession(sessionId)))
        throw "session not found";

      if(sessionInfo.status !== FaucetSessionStatus.CLAIMING)
        throw "session not claiming";

      new EthClaimNotificationClient(ws, sessionInfo.claim.claimIdx);
    } catch(ex) {
      ws.send(JSON.stringify({
        action: "error",
        data: {
          reason: ex.toString()
        }
      }));
      ws.close();
      return;
    }
  }

  public getTransactionQueue(queueOnly?: boolean): EthClaimInfo[] {
    let txlist: EthClaimInfo[] = [];
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
      totalPending += BigInt(claimTx.amount);
    });
    return totalPending;
  }

  public getLastProcessedClaimIdx(): number {
    return this.lastProcessedClaimTxIdx;
  }

  private updateClaimStatus(claimInfo: EthClaimInfo) {
    if(claimInfo.claim.claimStatus === ClaimTxStatus.CONFIRMED) {
      let moduleManager = ServiceManager.GetService(ModuleManager);
      moduleManager.processActionHooks([], ModuleHookAction.SessionClaimed, [claimInfo]);
      moduleManager.getModule<FaucetOutflowModule>("faucet-outflow")?.updateState(null, BigInt(claimInfo.claim.txFee));
      ServiceManager.GetService(FaucetStatsLog).addClaimStats(claimInfo);
    }
    ServiceManager.GetService(FaucetDatabase).updateClaimData(claimInfo.session, claimInfo.claim);
  }

  public async createSessionClaim(sessionData: FaucetSessionStoreData, userInput: any): Promise<EthClaimInfo> {
    if(sessionData.status !== FaucetSessionStatus.CLAIMABLE)
      throw new FaucetError("NOT_CLAIMABLE", "cannot claim session: not claimable (state: " + sessionData.status + ")");
    if(BigInt(sessionData.dropAmount) < BigInt(faucetConfig.minDropAmount))
      throw new FaucetError("AMOUNT_TOO_LOW", "drop amount lower than minimum");

    let maxDropAmount = BigInt(faucetConfig.maxDropAmount);
    if(sessionData.data["overrideMaxDropAmount"])
      maxDropAmount = BigInt(sessionData.data["overrideMaxDropAmount"]);
    if(BigInt(sessionData.dropAmount) > maxDropAmount)
      sessionData.dropAmount = maxDropAmount.toString();
    
    let claimInfo: EthClaimInfo = {
      session: sessionData.sessionId,
      target: sessionData.targetAddr,
      amount: sessionData.dropAmount,
      claim: sessionData.claim,
    };
    
    try {
      await ServiceManager.GetService(ModuleManager).processActionHooks([], ModuleHookAction.SessionClaim, [claimInfo, userInput]);
    } catch(ex) {
      if(ex instanceof FaucetError)
        throw ex;
      else
        throw new FaucetError("INTERNAL_ERROR", "claimSession failed: " + ex.toString());
    }
    
    // prevent multi claim via race condition
    if(this.claimTxDict[sessionData.sessionId])
      throw new FaucetError("RACE_CLAIMING", "cannot claim session: already claiming (race condition)");
    
    claimInfo.claim = {
      claimIdx: this.lastClaimTxIdx++,
      claimStatus: ClaimTxStatus.QUEUE,
      claimTime: Math.floor(new Date().getTime() / 1000),
    };
    sessionData.status = FaucetSessionStatus.CLAIMING;
    sessionData.dropAmount = claimInfo.amount;
    sessionData.claim = claimInfo.claim;
    ServiceManager.GetService(FaucetDatabase).updateSession(sessionData);

    this.claimTxQueue.push(claimInfo);
    this.claimTxDict[claimInfo.session] = claimInfo;
    return claimInfo;
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
          walletState.balance - BigInt(faucetConfig.spareFundsAmount) < BigInt(this.claimTxQueue[0].amount) ||
          walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
        )) {
          break; // skip processing (out of funds)
        }

        let claimTx = this.claimTxQueue.splice(0, 1)[0];
        this.lastProcessedClaimTxIdx = claimTx.claim.claimIdx;
        await this.processQueueTx(claimTx);
      }

      let now = Math.floor(new Date().getTime() / 1000);
      let walletRefreshTime = walletState.ready ? 600 : 10;
      if(Object.keys(this.pendingTxQueue).length === 0 && now - ServiceManager.GetService(EthWalletManager).getLastWalletRefresh() > walletRefreshTime) {
        await ServiceManager.GetService(EthWalletManager).loadWalletState();
      }

      if(faucetConfig.ethRefillContract && walletState.ready)
        await ServiceManager.GetService(EthWalletRefill).processWalletRefill();

      if(!this.lastClaimNotification || this.lastClaimNotification.processedIdx !== this.lastProcessedClaimTxIdx || this.lastClaimNotification.confirmedIdx !== this.lastConfirmedClaimTxIdx) {
        this.lastClaimNotification = {
          processedIdx: this.lastProcessedClaimTxIdx,
          confirmedIdx: this.lastConfirmedClaimTxIdx,
        };
        EthClaimNotificationClient.broadcastClaimNotification(this.lastClaimNotification);
      }
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

  private async processQueueTx(claimTx: EthClaimInfo) {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let walletState = ethWalletManager.getWalletState();
    if(!walletState.ready) {
      claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
      claimTx.claim.txError = "Network RPC is currently unreachable.";
      this.updateClaimStatus(claimTx);
      return;
    }
    if(
      walletState.balance - BigInt(faucetConfig.spareFundsAmount) < BigInt(claimTx.amount) ||
      walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
    ) {
      claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
      claimTx.claim.txError = "Faucet wallet is out of funds.";
      this.updateClaimStatus(claimTx);
      return;
    }

    try {
      claimTx.claim.claimStatus = ClaimTxStatus.PROCESSING;

      // send transaction
      let { txPromise } = await ethWalletManager.sendClaimTx(claimTx);
      this.pendingTxQueue[claimTx.claim.txHash] = claimTx;
      
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Submitted claim transaction " + claimTx.session + " [" + ethWalletManager.readableAmount(BigInt(claimTx.amount)) + "] to: " + claimTx.target + ": " + claimTx.claim.txHash);
      claimTx.claim.claimStatus = ClaimTxStatus.PENDING;
      this.updateClaimStatus(claimTx);

      this.awaitTxReceipt(claimTx, txPromise);
    } catch(ex) {
      claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
      claimTx.claim.txError = "Processing Exception: " + ex.toString();
      this.updateClaimStatus(claimTx);
    }
  }

  private awaitTxReceipt(claimTx: EthClaimInfo, txPromise: Promise<{
    status: boolean;
    block: number;
    fee: bigint;
    receipt: TransactionReceipt;
  }>) {
    // await transaction receipt
    txPromise.then((txData) => {
      delete this.pendingTxQueue[claimTx.claim.txHash];
      delete this.claimTxDict[claimTx.session];
      claimTx.claim.txBlock = txData.block;
      claimTx.claim.txFee = txData.fee.toString();

      this.lastConfirmedClaimTxIdx = claimTx.claim.claimIdx;

      claimTx.claim.claimStatus = ClaimTxStatus.CONFIRMED;
      this.updateClaimStatus(claimTx);
    }, (error) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Transaction for " + claimTx.target + " failed: " + error.toString());
      delete this.pendingTxQueue[claimTx.claim.txHash];
      delete this.claimTxDict[claimTx.session];
      claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
      claimTx.claim.txError = "Transaction Error: " + error.toString();
      this.updateClaimStatus(claimTx);
    }).then(() => {
      this.historyTxDict[claimTx.claim.txNonce] = claimTx;
      setTimeout(() => {
        delete this.historyTxDict[claimTx.claim.txNonce];
      }, 30 * 60 * 1000);
    });
  }

}
