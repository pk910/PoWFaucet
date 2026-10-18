import { WebSocket } from 'ws';
import { faucetConfig } from "../config/FaucetConfig.js";
import { FaucetLogLevel, FaucetProcess } from "../common/FaucetProcess.js";
import { ServiceManager } from "../common/ServiceManager.js";
import { EthWalletManager, PreparedClaimTx, TransactionDroppedError, TransactionRejectedError, WalletState } from "./EthWalletManager.js";
import { BatchTooExpensiveError } from "./claimtx/ClaimTxBuilder.js";
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
  /** the nonce was spent and no receipt for our hash was found: paid or not is not known. Terminal, counts as consumed, to be reconciled by hand. */
  UNKNOWN = "unknown",
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

/** seconds between a refused broadcast and the question to every endpoint whether it has the transaction after all */
const REFUSAL_RECHECK_DELAY = 2;

export class EthClaimManager {
  private initialized: boolean;
  private queueInterval: NodeJS.Timeout;
  private claimTxDict: {[session: string]: EthClaimInfo} = {};
  private claimTxQueue: EthClaimInfo[] = [];
  // one transaction pays one claim, or a batch of them (ethClaimTx.batch): both maps hold the claims per transaction
  private pendingTxQueue: {[hash: string]: EthClaimInfo[]} = {};
  private historyTxDict: {[nonce: number]: EthClaimInfo[]} = {};
  private queueProcessing: boolean = false;
  private delegationClearPending: boolean = false; // the startup attempt to clear a stale wallet delegation failed; the queue retries
  private batchSizeLimit: number | null = null; // what fits under the fee cap when a plan turned out too expensive; doubled after each confirmed batch until it reaches the configured size again
  private feeCapNoted: boolean = false;
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
        rebroadcasts.push(rebroadcast.then((res) => {
          this.awaitTxReceipt(claims, res.txPromise, txHash);
        }, async (err) => {
          // refused by every endpoint: the batch fails as a whole, unless an endpoint has it after all
          delete this.pendingTxQueue[txHash];
          if(err instanceof TransactionRejectedError && await this.keepRefusedIfKnown(claims, err.message))
            return;
          await this.failClaims(claims, "Processing Exception: " + rpcErrorString(err));
        }));
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

    // a delegation an earlier batching setup left on the wallet is cleared before the queue runs
    // (after the replays: its transaction takes the next free nonces)
    this.delegationClearPending = !(await ethWalletManager.ensureNoDelegation());

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
    // the row is the arbiter: claimable -> claiming for exactly this session (or the row is created
    // as claiming, for a session that was never stored), or someone else (another request, another
    // process) got there first
    let claiming: FaucetSessionStoreData = { ...sessionData, status: FaucetSessionStatus.CLAIMING, dropAmount: claimInfo.amount, claim: claimInfo.claim };
    if(!await ServiceManager.GetService(FaucetDatabase).startClaim(claiming))
      throw new FaucetError("RACE_CLAIMING", "cannot claim session: not claimable anymore");
    sessionData.status = FaucetSessionStatus.CLAIMING;
    sessionData.dropAmount = claimInfo.amount;
    sessionData.claim = claimInfo.claim;

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
      if(ethWalletManager.takeWalletStateReloadRequest())
        await ethWalletManager.loadWalletState(); // a given-up transaction's nonce, reloaded here and nowhere else
      let walletState = ethWalletManager.getWalletState();
      let now = Math.floor(new Date().getTime() / 1000);
      let batchSize = 1;
      let batchMaxWait = 0;
      let maxPending = faucetConfig.ethMaxPending;
      if(faucetConfig.ethClaimBatch && this.claimTxQueue.length > 0 && await ethWalletManager.ensureClaimBatching()) {
        let builder = ethWalletManager.getClaimTxBuilder();
        batchSize = builder.getBatchSize();
        batchMaxWait = builder.getBatchMaxWait();
        if(batchSize < faucetConfig.ethClaimBatch.maxClaims && !this.feeCapNoted) {
          this.feeCapNoted = true;
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "ethTxFeeCap limits claim batches to " + batchSize + " claims (worst-case gas * ethTxMaxFee); ethClaimBatch.maxClaims is " + faucetConfig.ethClaimBatch.maxClaims);
        }
        // Transaction pools allow a delegated account one in-flight transaction (geth and reth since
        // EIP-7702; a second one is refused or trickles in a block at a time). So one batch transaction
        // is in flight at a time, and `maxClaims` is the throughput lever, not `ethMaxPending`.
        if(builder.isBatchActive())
          maxPending = 1;
      }
      else if(this.delegationClearPending)
        this.delegationClearPending = !(await ethWalletManager.ensureNoDelegation());
      while(Object.keys(this.pendingTxQueue).length < maxPending && this.claimTxQueue.length > 0) {
        if(faucetConfig.ethQueueNoFunds && (
          !walletState.ready ||
          walletState.balance - BigInt(faucetConfig.spareFundsAmount) < BigInt(this.claimTxQueue[0].amount) ||
          walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
        )) {
          break; // skip processing (out of funds)
        }
        let size = batchSize;
        if(this.batchSizeLimit !== null) {
          if(this.batchSizeLimit >= batchSize)
            this.batchSizeLimit = null; // back at the configured size
          else
            size = this.batchSizeLimit;
        }
        if(size > 1 && this.claimTxQueue.length < size && now - this.claimTxQueue[0].claim.claimTime < batchMaxWait)
          break; // a partial batch: give it until maxWaitSeconds to fill up

        let claims = this.collectBatch(size, walletState);
        this.lastProcessedClaimTxIdx = Math.max(...claims.map((claimTx) => claimTx.claim.claimIdx));
        if(await this.processQueueTxs(claims) === "requeued")
          break; // the next tick continues with the smaller batches
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

  /**
   * These claims end failed, with the error for the client. The rows change in one awaited
   * statement before memory does: a crash in between leaves either a transaction a restart replays
   * for every one of its claims, or none, never a replay that pays claims already marked failed.
   */
  private async failClaims(claims: EthClaimInfo[], error: string): Promise<"failed"> {
    let failed = claims.map((claimTx) => ({ sessionId: claimTx.session, claimData: { ...claimTx.claim, claimStatus: ClaimTxStatus.FAILED, txError: error } }));
    await ServiceManager.GetService(FaucetDatabase).failClaimsBulk(failed);
    claims.forEach((claimTx, idx) => {
      claimTx.claim.claimStatus = ClaimTxStatus.FAILED;
      claimTx.claim.txError = error;
      claimTx.claim = failed[idx].claimData;
    });
    return "failed";
  }

  /** Pays these claims with one transaction: sent (awaiting its receipt), failed, or queued again after a refused broadcast. */
  private async processQueueTxs(claims: EthClaimInfo[]): Promise<"sent" | "failed" | "requeued"> {
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    let walletState = ethWalletManager.getWalletState();
    let failAll = (error: string): Promise<"failed"> => this.failClaims(claims, error);
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
      return "sent";
    } catch(ex) {
      if(ex instanceof BatchTooExpensiveError) {
        // nothing was signed or stored: the batch goes back as it is, the next ones are the size that fits
        this.batchSizeLimit = ex.fit;
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "A batch of " + claims.length + " claims would cost more than ethTxFeeCap, " + ex.fit + " fit: queued again in smaller batches");
        claims.forEach((claimTx) => claimTx.claim.claimStatus = ClaimTxStatus.QUEUE);
        this.claimTxQueue.unshift(...claims);
        this.claimTxQueue.sort((a, b) => a.claim.claimIdx - b.claim.claimIdx);
        return "requeued";
      }
      if(ex instanceof TransactionRejectedError && await this.keepRefusedIfKnown(claims, ex.message))
        return "sent";
      return failAll("Processing Exception: " + rpcErrorString(ex));
    }
  }

  /**
   * A claim is in one transaction, ever: the transaction may be sent again as the same bytes, the
   * claim never moves into another one. So a transaction every endpoint refused outright fails
   * its claims as a whole; the one exception is a refusal that was not one. A gateway may answer
   * an error after its upstream took the bytes, so after a moment every endpoint is asked whether
   * it has the transaction after all: if one has, the claims stay pending under it and its
   * receipt decides. True then; false when nobody has it, and the caller fails the claims.
   */
  private async keepRefusedIfKnown(claims: EthClaimInfo[], reason: string): Promise<boolean> {
    let txHash = claims[0].claim.txHash;
    if(!txHash)
      return false;
    let ethWalletManager = ServiceManager.GetService(EthWalletManager);
    await new Promise((resolve) => setTimeout(resolve, REFUSAL_RECHECK_DELAY * 1000));
    let knownBy = await ethWalletManager.endpointKnowingTransaction(txHash);
    if(!knownBy)
      return false;
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Broadcast of TX " + txHash + " was refused, but " + knownBy + " has it: watching its receipt (" + reason + ")");
    this.pendingTxQueue[txHash] = claims;
    claims.forEach((claimTx) => {
      claimTx.claim.claimStatus = ClaimTxStatus.PENDING;
      this.updateClaimStatus(claimTx);
    });
    this.awaitTxReceipt(claims, ethWalletManager.watchClaimTx(claims[0]), txHash);
    return true;
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
      if(this.batchSizeLimit !== null && claims.length >= this.batchSizeLimit)
        this.batchSizeLimit *= 2; // a batch of the reduced size went through: try bigger
    }).catch((error) => {
      if(error instanceof TransactionDroppedError) {
        // the nonce is spent and our hash has no receipt. Most likely another transaction took the
        // slot and nobody was paid, but "most likely" does not reopen a payout: the claims end in a
        // terminal state that counts as consumed, for an operator to reconcile against the chain
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Transaction for " + targetLabel + " has an unknown outcome, reconcile by hand: " + error.message);
        delete this.pendingTxQueue[txHash];
        claims.forEach((claimTx) => {
          delete this.claimTxDict[claimTx.session];
          claimTx.claim.claimStatus = ClaimTxStatus.UNKNOWN;
          claimTx.claim.txError = "Transaction outcome unknown: " + error.message;
          this.updateClaimStatus(claimTx);
        });
        return;
      }
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
