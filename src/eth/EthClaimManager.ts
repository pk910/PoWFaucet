import { WebSocket } from 'ws';
import { faucetConfig } from "../config/FaucetConfig.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { EthWalletManager, PreparedClaimTx, WalletState } from "./EthWalletManager.js";
import { FaucetStatsLog } from "../services/FaucetStatsLog.js";
import { FaucetDatabase } from "../db/FaucetDatabase.js";
import { EthWalletRefill } from "./EthWalletRefill.js";
import { FaucetSessionStatus, FaucetSessionStoreData } from "../session/FaucetSession.js";
import { FaucetError } from '../common/FaucetError.js';
import { ModuleHookAction, ModuleManager } from '../modules/ModuleManager.js';
import { FaucetHttpServer } from '../webserv/FaucetHttpServer.js';
import { IncomingMessage } from 'http';
import { EthClaimNotificationClient, IEthClaimNotificationData } from './EthClaimNotificationClient.js';
import { FaucetOutflowModule } from '../modules/faucet-outflow/FaucetOutflowModule.js';
import { clearInterval } from 'timers';
import { EthTxReceipt, rpcErrorString } from "./rpc/index.js";

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
  /** the session's data at claim time, for {session.<key>} placeholders in a transaction template */
  data?: {[key: string]: any};
}

export interface EthClaimData {
  claimIdx: number;
  claimStatus: ClaimTxStatus;
  claimTime: number,
  txHash?: string;
  txHex?: string;
  txNonce?: number;
  /** this claim's sub-calls in a batch transaction's stream (offset and count), so its receipt can be read from the row alone */
  txCalls?: { offset: number; count: number };
  txBlock?: number;
  txFee?: string;
  txError?: string;
}

export class EthClaimManager {
  private initialized: boolean;
  private queueInterval: NodeJS.Timeout;
  private claimTxDict: {[session: string]: EthClaimInfo} = {};
  private claimTxQueue: EthClaimInfo[] = [];
  // one transaction pays one claim, or a batch of them (ethClaimTx.batch): both maps hold the claims per transaction
  private pendingTxQueue: {[hash: string]: EthClaimInfo[]} = {};
  private historyTxDict: {[nonce: number]: EthClaimInfo[]} = {};
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
    let database = ServiceManager.GetService(FaucetDatabase);
    let storedSession = await database.getSessions([
      FaucetSessionStatus.CLAIMING,
    ]);
    storedSession.forEach((sessionData) => {
      let claimInfo: EthClaimInfo = {
        session: sessionData.sessionId,
        target: sessionData.targetAddr,
        amount: sessionData.dropAmount,
        claim: sessionData.claim,
        data: sessionData.data,
      };
      // a "processing" row with the signed transaction in it was written right before the
      // broadcast; the process died in between and the bytes may or may not be out: treat it as
      // pending and send the same bytes again, never a new transaction
      if(claimInfo.claim.claimStatus === ClaimTxStatus.PROCESSING && claimInfo.claim.txHex && claimInfo.claim.txHash)
        claimInfo.claim.claimStatus = ClaimTxStatus.PENDING;
      switch(claimInfo.claim.claimStatus) {
        case ClaimTxStatus.QUEUE:
        case ClaimTxStatus.PROCESSING:
          this.claimTxQueue.push(claimInfo);
          this.claimTxDict[claimInfo.session] = claimInfo;
          break;
        case ClaimTxStatus.PENDING:
          // claims of one batch share the hash: watched once, below
          if(!this.pendingTxQueue[claimInfo.claim.txHash])
            this.pendingTxQueue[claimInfo.claim.txHash] = [];
          this.pendingTxQueue[claimInfo.claim.txHash].push(claimInfo);
          this.claimTxDict[claimInfo.session] = claimInfo;
          break;
        default:
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Cannot restore claimTx: unexpected claim status '" + claimInfo.claim.claimStatus + "'");
          return;
      }
      if(claimInfo.claim.claimIdx > maxQueueIdx)
        maxQueueIdx = claimInfo.claim.claimIdx;
    });

    // pending transactions: the ones with their signed bytes stored go out again (the network
    // ignores bytes it has seen; a transaction the crash kept from being sent gets sent), the
    // others (from before the bytes were kept) are watched by hash
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let rebroadcasts: Promise<unknown>[] = [];
    Object.keys(this.pendingTxQueue).forEach((txHash) => {
      let claims = this.pendingTxQueue[txHash];
      let signed = claims.find((claimInfo) => !!claimInfo.claim.txHex);
      if(signed) {
        claims.forEach((claimInfo) => this.updateClaimStatus(claimInfo)); // "processing" rows become "pending"
        let rebroadcast = ethWalletManager.rebroadcastClaimTx({ txHash: txHash, txNonce: signed.claim.txNonce, txHex: signed.claim.txHex }, claims);
        rebroadcasts.push(rebroadcast.catch(() => {}));
        this.awaitTxReceipt(claims, rebroadcast.then((res) => res.txPromise), txHash);
      } else {
        this.awaitTxReceipt(claims, ethWalletManager.watchClaimTx(claims[0]), txHash);
      }
    });
    if(rebroadcasts.length > 0) {
      // the queue must not hand out a nonce a replayed transaction just took
      await Promise.all(rebroadcasts);
      await ethWalletManager.loadWalletState();
    }

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
      Object.values(this.pendingTxQueue).forEach((claims) => Array.prototype.push.apply(txlist, claims));
      Object.values(this.historyTxDict).forEach((claims) => Array.prototype.push.apply(txlist, claims));
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
      data: sessionData.data,
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
    // the row is the arbiter: claimable -> claiming for exactly this session, or someone else
    // (another request, another process) got there first
    let database = ServiceManager.GetService(FaucetDatabase);
    let admitted = await database.startClaim(sessionData.sessionId, claimInfo.amount, claimInfo.claim);
    if(admitted === "conflict")
      throw new FaucetError("RACE_CLAIMING", "cannot claim session: not claimable anymore");
    sessionData.status = FaucetSessionStatus.CLAIMING;
    sessionData.dropAmount = claimInfo.amount;
    sessionData.claim = claimInfo.claim;
    if(admitted === "missing")
      await database.updateSession(sessionData); // a session that was never stored: write it whole

    this.claimTxQueue.push(claimInfo);
    this.claimTxDict[claimInfo.session] = claimInfo;
    return claimInfo;
  }

  public async processQueue() {
    if(this.queueProcessing)
      return;
    this.queueProcessing = true;

    try {
      let ethWalletManager = ServiceManager.GetService(EthWalletManager);
      let walletState = ethWalletManager.getWalletState();
      let now = Math.floor(new Date().getTime() / 1000);
      let batchSize = 1;
      let batchMaxWait = 0;
      if(faucetConfig.ethClaimBatch && this.claimTxQueue.length > 0 && await ethWalletManager.ensureClaimBatching()) {
        let builder = ethWalletManager.getClaimTxBuilder();
        batchSize = builder.getBatchSize();
        batchMaxWait = builder.getBatchMaxWait();
      }
      while(Object.keys(this.pendingTxQueue).length < faucetConfig.ethMaxPending && this.claimTxQueue.length > 0) {
        if(faucetConfig.ethQueueNoFunds && (
          !walletState.ready ||
          walletState.balance - BigInt(faucetConfig.spareFundsAmount) < BigInt(this.claimTxQueue[0].amount) ||
          walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
        )) {
          break; // skip processing (out of funds)
        }
        if(batchSize > 1 && this.claimTxQueue.length < batchSize && now - this.claimTxQueue[0].claim.claimTime < batchMaxWait)
          break; // a partial batch: give it until maxWaitSeconds to fill up

        let claims = this.collectBatch(batchSize, walletState);
        this.lastProcessedClaimTxIdx = Math.max(...claims.map((claimTx) => claimTx.claim.claimIdx));
        await this.processQueueTxs(claims);
      }

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

  /**
   * The claims for the next transaction: the first queued one, then more up to `batchSize` as long as
   * the wallet can cover their sum. What does not fit waits for the next transaction.
   */
  private collectBatch(batchSize: number, walletState: WalletState): EthClaimInfo[] {
    let claims: EthClaimInfo[] = [this.claimTxQueue.shift()];
    let total = BigInt(claims[0].amount);
    while(claims.length < batchSize && this.claimTxQueue.length > 0) {
      let next = this.claimTxQueue[0];
      let nextTotal = total + BigInt(next.amount);
      if(walletState.ready && walletState.balance - BigInt(faucetConfig.spareFundsAmount) < nextTotal)
        break;
      claims.push(this.claimTxQueue.shift());
      total = nextTotal;
    }
    return claims;
  }

  private async processQueueTxs(claims: EthClaimInfo[]) {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let walletState = ethWalletManager.getWalletState();
    let failAll = (error: string) => {
      claims.forEach((claimTx) => {
        claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
        claimTx.claim.txError = error;
        this.updateClaimStatus(claimTx);
      });
    };
    if(!walletState.ready)
      return failAll("Network RPC is currently unreachable.");
    let totalAmount = claims.reduce((sum, claimTx) => sum + BigInt(claimTx.amount), 0n);
    if(
      walletState.balance - BigInt(faucetConfig.spareFundsAmount) < totalAmount ||
      walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
    )
      return failAll("Faucet wallet is out of funds.");

    // between signing and broadcasting: the signed transaction goes into every claim's session row
    // first (still "processing"), so a crash in between replays these bytes on restart instead of
    // building a new transaction for the same claims
    let database = ServiceManager.GetService(FaucetDatabase);
    let persistBeforeBroadcast = async (prepared: PreparedClaimTx) => {
      // one statement for the whole batch: all rows learn the transaction, or none does; and every
      // row must have, or the bytes do not leave (a row that is not "claiming" any more is not ours to pay)
      let written = await database.updateClaimDataBulk(claims.map((claimTx) => ({ sessionId: claimTx.session, claimData: claimTx.claim })));
      if(written !== claims.length)
        throw new Error("only " + written + " of " + claims.length + " claim rows accepted the signed transaction");
    };

    try {
      claims.forEach((claimTx) => claimTx.claim.claimStatus = ClaimTxStatus.PROCESSING);

      // send transaction
      let txResult = claims.length === 1 ? await ethWalletManager.sendClaimTx(claims[0], persistBeforeBroadcast) : await ethWalletManager.sendClaimBatch(claims, persistBeforeBroadcast);
      let txHash = txResult.txHash || claims[0].claim.txHash;
      this.pendingTxQueue[txHash] = claims;

      claims.forEach((claimTx) => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Submitted claim transaction " + claimTx.session + " [" + ethWalletManager.readableAmount(BigInt(claimTx.amount)) + "] to: " + claimTx.target + ": " + txHash + (claims.length > 1 ? " (batch of " + claims.length + ")" : ""));
        claimTx.claim.claimStatus = ClaimTxStatus.PENDING;
        this.updateClaimStatus(claimTx);
      });

      this.awaitTxReceipt(claims, txResult.txPromise, txHash);
    } catch(ex) {
      failAll("Processing Exception: " + rpcErrorString(ex));
    }
  }

  /**
   * Settle the claims of one transaction from its receipt. A reverted transaction fails all of
   * them; a mined one confirms them, except recipients the contract reported as failed
   * (ethClaimTx.batch.failedEvent). The fee is split evenly, the remainder goes to the first claim.
   */
  private awaitTxReceipt(claims: EthClaimInfo[], txPromise: Promise<{
    status: boolean;
    block: number;
    fee: bigint;
    receipt: EthTxReceipt;
  }>, txHash: string) {
    let targetLabel = claims.length === 1 ? claims[0].target : claims.length + " claims";
    txPromise.then((txData) => {
      let count = BigInt(claims.length);
      let feeShare = txData.fee / count;
      let feeRemainder = txData.fee - feeShare * count;
      claims.forEach((claimTx, idx) => {
        claimTx.claim.txFee = (feeShare + (idx === 0 ? feeRemainder : 0n)).toString();
      });
      if(!txData.status) {
        throw "transaction reverted";
      }

      // per claim: how many of its sub-calls the batcher could not make (read from the receipt and
      // the row's own call range, independent of the current configuration)
      let evaluation = ServiceManager.GetService(EthWalletManager).evaluateClaimReceipt(txData.receipt, claims);
      if(evaluation.executed === false)
        throw "the batch transaction mined without running the payout code (the wallet's code was not the batcher)";
      let outcomes = evaluation.outcomes;
      delete this.pendingTxQueue[txHash];
      let confirmedIdx = this.lastConfirmedClaimTxIdx;
      claims.forEach((claimTx, claimPos) => {
        delete this.claimTxDict[claimTx.session];
        let outcome = outcomes.get(claimPos);
        if(outcome && outcome.failed > 0 && outcome.failed >= outcome.total) {
          // nothing reached the recipient: the claim failed, the session may try again
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Transaction " + txHash + " could not pay " + claimTx.target + " (position " + claimPos + "): the batcher reported the payout as failed");
          claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
          claimTx.claim.txError = "Transaction Error: the payout to this address failed";
        } else {
          // paid, in full or in part. A partial payout is still a payout: the claim is consumed and
          // counts towards every limit, otherwise a recipient that refuses one of its calls could
          // collect the others again and again
          if(outcome && outcome.failed > 0) {
            ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Transaction " + txHash + " paid " + claimTx.target + " (position " + claimPos + ") only in part: " + outcome.failed + " of " + outcome.total + " calls failed");
            claimTx.claim.txError = "Partial payout: " + outcome.failed + " of " + outcome.total + " calls failed";
          }
          claimTx.claim.txBlock = txData.block;
          claimTx.claim.claimStatus = ClaimTxStatus.CONFIRMED;
          if(claimTx.claim.claimIdx > confirmedIdx)
            confirmedIdx = claimTx.claim.claimIdx;
        }
        this.updateClaimStatus(claimTx);
      });
      this.lastConfirmedClaimTxIdx = confirmedIdx;
    }).catch((error) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Transaction for " + targetLabel + " failed: " + rpcErrorString(error));
      delete this.pendingTxQueue[txHash];
      claims.forEach((claimTx) => {
        delete this.claimTxDict[claimTx.session];
        claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
        claimTx.claim.txError = "Transaction Error: " + rpcErrorString(error);
        this.updateClaimStatus(claimTx);
      });
    }).then(() => {
      let txNonce = claims[0].claim.txNonce;
      this.historyTxDict[txNonce] = claims;
      setTimeout(() => {
        delete this.historyTxDict[txNonce];
      }, 30 * 60 * 1000);
    });
  }

}
