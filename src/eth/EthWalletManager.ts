import { faucetConfig } from '../config/FaucetConfig.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';
import { FaucetStatus, FaucetStatusLevel } from '../services/FaucetStatus.js';
import { strFormatPlaceholder } from '../utils/StringUtils.js';
import { sleepPromise } from '../utils/PromiseUtils.js';
import { EthClaimInfo } from './EthClaimManager.js';
import { Erc20Abi } from '../abi/ERC20.js';
import { RpcEndpointPool } from './RpcEndpointPool.js';
import { ContractAbiInput, ContractCaller, EthSigner, EthTxReceipt, Hex, IEthRpcClient, isTransportError, keccak256, rpcErrorString } from "./rpc/index.js";
import { ClaimTxBuilder, ClaimTxPlan } from './claimtx/ClaimTxBuilder.js';
import { BatchDelegation } from './claimtx/BatchDelegation.js';

export interface WalletState {
  ready: boolean;
  nonce: number;
  balance: bigint;
  nativeBalance: bigint;
}

interface FaucetTokenState {
  address: string;
  decimals: number;
  getBalance(addr: string): Promise<bigint>;
  getTransferData(addr: string, amount: bigint): string;
}

export enum FaucetCoinType {
  NATIVE = "native",
  ERC20 = "erc20",
}

export interface TransactionResult {
  txHash: string;
  txPromise: Promise<{
    status: boolean;
    block: number;
    fee: bigint;
    receipt: EthTxReceipt;
  }>;
}

export interface ClaimTransactionResult extends TransactionResult {
  /** what the transaction pays (one claim, or a batch) */
  plan: ClaimTxPlan;
}

/** A signed claim transaction that has not been broadcast yet. */
export interface PreparedClaimTx {
  /** computed locally from the signed bytes */
  txHash: string;
  txNonce: number;
  /** signed transaction, hex without 0x */
  txHex: string;
  plan: ClaimTxPlan;
  claims: EthClaimInfo[];
}

/**
 * Runs between signing and broadcasting; the claim manager writes the signed transaction into
 * its claims' session rows here, so a crash in between replays the exact bytes instead of paying again.
 */
export type BeforeBroadcastHook = (prepared: PreparedClaimTx) => Promise<void>;

/** What a mined claim transaction's receipt says per claim; `executed` is null for a plain (non-batch) transaction. */
export interface ClaimReceiptEvaluation {
  executed: boolean | null;
  outcomes: Map<number, { failed: number; total: number }>;
}

/** polls in a row that must show the nonce spent and no receipt before a transaction counts as dropped */
const DROPPED_CONFIRMATION_POLLS = 3;

/**
 * The nonce was spent and our hash has no receipt. Another transaction most likely took the slot,
 * but a receipt lagging behind the nonce on some endpoint looks the same, so this is not proof of
 * non-payment: callers treat it as an unknown outcome, never as a failure that frees the payout.
 */
export class TransactionDroppedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TransactionDroppedError";
  }
}

/** Every endpoint refused the broadcast outright: the bytes are nowhere, the nonce was reloaded. */
export class TransactionRejectedError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TransactionRejectedError";
  }
}

export class EthWalletManager {

  private initialized: boolean;
  private rpcPool: RpcEndpointPool;
  private chainId: number | null = null;
  private signer: EthSigner;
  private walletAddr: string;
  private walletState: WalletState;
  private tokenState: FaucetTokenState;
  private claimTxBuilder: ClaimTxBuilder | null = null;
  private batchDelegation: BatchDelegation | null = null;
  private lastWalletRefresh: number;
  private txReceiptPollInterval = 12000;
  /**
   * While the wallet is delegated one claim transaction is in flight at a time, and the time between
   * its receipt and the poll that sees it is the queue's throughput: a batch mined in one slot
   * only gets a successor into the next slot when the poll notices within that slot. 3 s instead of
   * 12 for one pending transaction costs nothing.
   */
  private static readonly BATCHING_RECEIPT_POLL_INTERVAL = 3000;

  /** the pool's routing client: each call goes to the highest-priority ready endpoint at that moment */
  private get client(): IEthRpcClient {
    return this.rpcPool.getClient();
  }

  public getRpcPool(): RpcEndpointPool {
    return this.rpcPool;
  }

  /** The pool's routing client. */
  public getClient(): IEthRpcClient {
    return this.client;
  }

  public async initialize(): Promise<void> {
    if(this.initialized)
      return;
    this.initialized = true;

    this.walletState = {
      ready: false,
      nonce: 0,
      balance: 0n,
      nativeBalance: 0n,
    };

    this.startRpcPool();
    if(typeof faucetConfig.ethChainId === "number")
      this.setChainId(faucetConfig.ethChainId);

    this.signer = new EthSigner(faucetConfig.ethWalletKey);
    this.walletAddr = this.signer.address;

    await this.loadWalletState();

    // reload handler
    ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
      this.startRpcPool();
      this.lastWalletRefresh = 0;
    });
  }

  public dispose(): void {
    if(!this.initialized)
      return;
    this.initialized = false;
    if(this.rpcPool) {
      this.rpcPool.dispose();
      this.rpcPool = null;
    }
  }

  private setChainId(chainId: number) {
    if(this.chainId === chainId)
      return;
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "RPC chain id: " + chainId);
    this.chainId = chainId;
  }

  private startRpcPool() {
    if(this.rpcPool)
      this.rpcPool.dispose();
    this.rpcPool = new RpcEndpointPool();
    this.rpcPool.initialize(faucetConfig.ethRpcHost);

    if(faucetConfig.faucetCoinType !== FaucetCoinType.NATIVE)
      this.initToken();
    else
      this.tokenState = null;
    this.claimTxBuilder = null; // rebuilt on first use with the (possibly reloaded) template config
    this.batchDelegation = null; // the chain is checked again on the next batch
  }

  private initToken() {
    switch(faucetConfig.faucetCoinType) {
      case FaucetCoinType.ERC20:
        let tokenAddr = faucetConfig.faucetCoinContract;
        // over the pool's routing client, so failover is transparent
        let tokenContract = new ContractCaller(this.client, tokenAddr, Erc20Abi);
        this.tokenState = {
          address: tokenAddr,
          decimals: 0,
          getBalance: async (addr: string) => BigInt(await tokenContract.call("balanceOf", [addr]) as bigint),
          getTransferData: (addr: string, amount: bigint) => tokenContract.encode("transfer", [addr, amount]),
        };
        tokenContract.call("decimals").then((res) => {
          this.tokenState.decimals = Number(res);
        }, () => {
          // the next loadWalletState surfaces an unreachable token contract
        });
        break;
      default:
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Unknown coin type: " + faucetConfig.faucetCoinType);
        return;
    }
  }

  public getWalletState(): WalletState {
    return this.walletState;
  }

  public getLastWalletRefresh(): number {
    return this.lastWalletRefresh;
  }

  public loadWalletState(): Promise<void> {
    this.lastWalletRefresh = Math.floor(new Date().getTime() / 1000);
    let chainIdPromise = typeof faucetConfig.ethChainId === "number" ? Promise.resolve(faucetConfig.ethChainId) : this.client.getChainId();
    let tokenBalancePromise = this.tokenState?.getBalance(this.walletAddr);
    return Promise.all([
      this.client.getBalance(this.walletAddr, "pending"),
      this.client.getTransactionCount(this.walletAddr, "pending"),
      chainIdPromise,
      tokenBalancePromise,
    ]).catch((ex) => {
      if(rpcErrorString(ex).match(/"pending" is not yet supported|pending state is not available|pending block is not available/i)) {
        return Promise.all([
          this.client.getBalance(this.walletAddr),
          this.client.getTransactionCount(this.walletAddr),
          chainIdPromise,
          tokenBalancePromise,
        ]);
      }
      else
        throw ex;
    }).then((res) => {
      this.setChainId(Number(res[2]));
      Object.assign(this.walletState, {
        ready: true,
        balance: this.tokenState ? BigInt(res[3]) : BigInt(res[0]),
        nativeBalance: BigInt(res[0]),
        nonce: Number(res[1]),
      });
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Wallet " + this.walletAddr + ":  " + this.readableAmount(this.walletState.balance) + "  [Nonce: " + this.walletState.nonce + "]");
    }, (err) => {
      Object.assign(this.walletState, {
        ready: false,
        balance: 0n,
        nativeBalance: 0n,
        nonce: 0,
      });
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error loading wallet state for " + this.walletAddr + ": " + rpcErrorString(err));
    }).then(() => {
      this.updateFaucetStatus();
    });
  }

  private updateFaucetStatus() {
    let statusMessage: string = null;
    let statusLevel: FaucetStatusLevel = null;
    if(this.walletState) {
      if(!statusLevel && !this.walletState.ready) {
        if(typeof faucetConfig.rpcConnectionError === "string")
          statusMessage = faucetConfig.rpcConnectionError;
        else if(faucetConfig.rpcConnectionError)
          statusMessage = "The faucet could not connect to the network RPC";
        if(statusMessage) {
          statusMessage = strFormatPlaceholder(statusMessage);
          statusLevel = FaucetStatusLevel.ERROR;
        }
      }
      if(!statusLevel && (
        this.walletState.balance <= faucetConfig.noFundsBalance ||
        this.walletState.nativeBalance <= BigInt(faucetConfig.ethTxGasLimit) * BigInt(faucetConfig.ethTxMaxFee)
      )) {
        if(typeof faucetConfig.noFundsError === "string")
          statusMessage = faucetConfig.noFundsError;
        else if(faucetConfig.noFundsError)
          statusMessage = "The faucet is out of funds!";
        if(statusMessage) {
          statusMessage = strFormatPlaceholder(statusMessage);
          statusLevel = FaucetStatusLevel.ERROR;
        }
      }
      if(!statusLevel && this.walletState.balance <= faucetConfig.lowFundsBalance) {
        if(typeof faucetConfig.lowFundsWarning === "string")
          statusMessage = faucetConfig.lowFundsWarning;
        else if(faucetConfig.lowFundsWarning)
          statusMessage = "The faucet is running out of funds! Faucet Balance: {1}";
        if(statusMessage) {
          statusMessage = strFormatPlaceholder(statusMessage, this.readableAmount(this.walletState.balance));
          statusLevel = FaucetStatusLevel.WARNING;
        }
      }
    }
    ServiceManager.GetService(FaucetStatus).setFaucetStatus("wallet", statusMessage, statusLevel);
  }

  public getFaucetAddress(): string {
    return this.walletAddr;
  }

  public getTokenAddress(): string {
    return this.tokenState ? this.tokenState.address : null;
  }

  public getFaucetDecimals(native?: boolean): number {
    return ((this.tokenState && !native) ? this.tokenState.decimals : 18) || 18;
  }

  public decimalUnitAmount(amount: bigint, native?: boolean): number {
    let decimals = this.getFaucetDecimals(native);
    let factor = Math.pow(10, decimals);
    return parseInt(amount.toString()) / factor;
  }

  public readableAmount(amount: bigint, native?: boolean): string {
    let amountStr = (Math.floor(this.decimalUnitAmount(amount, native) * 1000) / 1000).toString();
    return amountStr + " " + (native ? "ETH" : faucetConfig.faucetCoinSymbol);
  }

  public async getWalletBalance(addr: string): Promise<bigint> {
    if(this.tokenState)
      return await this.tokenState.getBalance(addr);
    else
      return await this.client.getBalance(addr);
  }

  public checkIsContract(addr: string): Promise<boolean> {
    return this.client.getCode(addr).then((res) => res && !!res.match(/^0x[0-9a-f]{2,}$/) && !res.match(/^0xef0100/));
  }

  public getFaucetBalance(native?: boolean): bigint | null {
    if(native)
      return this.walletState?.nativeBalance;
    else
      return this.walletState?.balance;
  }

  /** A contract on the active endpoint, addressed by function name (config-driven calls like the refill contract). */
  public getContract(addr: string, abi: ContractAbiInput): ContractCaller {
    return new ContractCaller(this.client, addr, abi);
  }

  /** How claims become transactions: the plain transfer, or the operator's ethClaimTx template. */
  public getClaimTxBuilder(): ClaimTxBuilder {
    if(!this.claimTxBuilder) {
      // the client is only needed for gas estimation; a manager that never initialized (tests stub the sends) has no pool
      let client = this.rpcPool ? this.rpcPool.getClient() : null;
      this.claimTxBuilder = new ClaimTxBuilder(client, this.walletAddr, this.tokenState ? this.tokenState.address : null, faucetConfig.ethClaimTx, faucetConfig.ethClaimBatch);
      this.claimTxBuilder.setBatchActive(!!this.batchDelegation?.isReady());
    }
    return this.claimTxBuilder;
  }

  /**
   * Batching needs the wallet to run the batcher's code (EIP-7702). Sets that up on first use
   * (two transactions at most, see BatchDelegation) and says whether batches may be built now.
   * Called from the claim queue, so the setup transactions share the queue's nonce sequence.
   */
  public async ensureClaimBatching(): Promise<boolean> {
    if(!faucetConfig.ethClaimBatch || !(faucetConfig.ethClaimBatch.maxClaims > 1) || !this.rpcPool || !this.walletState?.ready)
      return false;
    if(!this.batchDelegation)
      this.batchDelegation = new BatchDelegation(this);
    let ready = await this.batchDelegation.ensureReady();
    this.getClaimTxBuilder().setBatchActive(ready);
    return ready;
  }

  /**
   * Without batching the wallet should carry no delegation: pools allow a delegated account one
   * in-flight transaction, and nothing here would use the code. Clears one left behind by an
   * earlier setup, once (one transaction, see BatchDelegation); `ethIgnoreDelegate` keeps it.
   * True when the wallet is in order (or none of this applies), false when the attempt failed
   * and should be repeated. Called by the claim manager, so the transaction shares the queue's
   * nonce sequence.
   */
  public async ensureNoDelegation(): Promise<boolean> {
    if(faucetConfig.ethIgnoreDelegate || (faucetConfig.ethClaimBatch && faucetConfig.ethClaimBatch.maxClaims > 1) || !this.rpcPool)
      return true;
    if(!this.walletState?.ready)
      return false;
    if(!this.batchDelegation)
      this.batchDelegation = new BatchDelegation(this);
    return await this.batchDelegation.ensureCleared();
  }

  /** The label of an RPC endpoint that has this transaction after all, null when none does. */
  public endpointKnowingTransaction(txHash: string): Promise<string | null> {
    if(!this.rpcPool)
      return Promise.resolve(null);
    return this.rpcPool.endpointKnowingTransaction(txHash);
  }

  /** Positions (in the transaction's claim list) a mined claim transaction reported as not paid; empty without a template that names a failed event. */
  public evaluateClaimReceipt(receipt: EthTxReceipt, claims: EthClaimInfo[]): ClaimReceiptEvaluation {
    let outcomes = new Map<number, { failed: number; total: number }>();
    if(!claims.some((claim) => !!claim.claim.txCalls) || !this.walletAddr)
      return { executed: null, outcomes }; // not a batch transaction: the receipt status says it all
    if(!ClaimTxBuilder.batchExecuted(this.walletAddr, receipt.logs))
      return { executed: false, outcomes }; // mined, but the wallet did not run the batcher: nobody was paid
    let failedCalls = ClaimTxBuilder.failedCallIndexes(this.walletAddr, receipt.logs);
    claims.forEach((claim, pos) => {
      let range = claim.claim.txCalls;
      if(!range)
        return;
      let failed = 0;
      for(let i = range.offset; i < range.offset + range.count; i++) {
        if(failedCalls.has(i))
          failed++;
      }
      outcomes.set(pos, { failed, total: range.count });
    });
    return { executed: true, outcomes };
  }

  private txResultFromReceipt(receipt: EthTxReceipt): { status: boolean; block: number; fee: bigint; receipt: EthTxReceipt } {
    let txfee = receipt.effectiveGasPrice * receipt.gasUsed;
    this.walletState.nativeBalance -= txfee;
    if(!this.tokenState)
      this.walletState.balance -= txfee;
    return {
      status: receipt.status,
      block: receipt.blockNumber,
      fee: txfee,
      receipt: receipt,
    };
  }

  public async watchClaimTx(claimInfo: EthClaimInfo): Promise<{
    status: boolean;
    block: number;
    fee: bigint;
    receipt: EthTxReceipt;
  }> {
    return this.awaitTransactionReceipt(claimInfo.claim.txHash, claimInfo.claim.txNonce, claimInfo.claim.txHex, false).then((receipt) => this.txResultFromReceipt(receipt));
  }

  public sendClaimTx(claimInfo: EthClaimInfo, beforeBroadcast?: BeforeBroadcastHook): Promise<ClaimTransactionResult> {
    return this.sendClaimBatch([claimInfo], beforeBroadcast);
  }

  /**
   * Pay these claims with one transaction. One claim is the plain transfer (or the template's
   * single-claim call); several need a template with a batch block.
   *
   * The transaction is signed once. `beforeBroadcast` runs with the signed bytes so they can be
   * persisted; then the same bytes go out, and only those: a retry never rebuilds the transaction
   * with another nonce, because an answer lost on the way back does not mean the node did not take it.
   */
  public async sendClaimBatch(claims: EthClaimInfo[], beforeBroadcast?: BeforeBroadcastHook): Promise<ClaimTransactionResult> {
    let prepared = await this.prepareClaimTx(claims);
    if(beforeBroadcast) {
      try {
        await beforeBroadcast(prepared);
      } catch(ex) {
        // nothing was sent: the nonce is free again, and the claims carry no transaction
        if(this.walletState.nonce === prepared.txNonce + 1)
          this.walletState.nonce = prepared.txNonce;
        claims.forEach((claim) => {
          delete claim.claim.txHash;
          delete claim.claim.txHex;
          delete claim.claim.txNonce;
          delete claim.claim.txCalls;
        });
        throw ex;
      }
    }
    return this.broadcastClaimTx(prepared, true);
  }

  /**
   * Build, check and sign the transaction for these claims and reserve its nonce. Nothing has left
   * the faucet yet. Every claim carries nonce, hash and the signed hex: the session row is the
   * record a restart replays from.
   */
  public async prepareClaimTx(claims: EthClaimInfo[]): Promise<PreparedClaimTx> {
    let plan = await this.getClaimTxBuilder().buildPlan(claims);
    this.checkPlanFunds(plan, claims);
    let nonce = this.walletState.nonce;
    let txHex = await this.buildEthTx(plan.to, plan.value, nonce, plan.data, plan.gasLimit);
    let txHash = keccak256(("0x" + txHex) as Hex);
    this.walletState.nonce++;
    claims.forEach((claim, idx) => {
      claim.claim.txNonce = nonce;
      claim.claim.txHash = txHash;
      claim.claim.txHex = txHex;
      claim.claim.txCalls = plan.callRanges ? plan.callRanges[idx] : undefined;
    });
    return { txHash, txNonce: nonce, txHex, plan, claims };
  }

  /**
   * The plan's own numbers against the wallet, right before signing: the queue's preflight only
   * knew the claim amounts and the default gas limit, a template may send more value or need more gas.
   */
  private checkPlanFunds(plan: ClaimTxPlan, claims: EthClaimInfo[]) {
    let totalAmount = claims.reduce((sum, claim) => sum + BigInt(claim.amount), 0n);
    if(!this.tokenState && plan.nativeSpend > totalAmount)
      throw new Error("transaction sends " + plan.nativeSpend.toString() + " wei, more than the claims' " + totalAmount.toString());
    if(!this.walletState.ready)
      return;
    let gasReserve = BigInt(plan.gasLimit) * BigInt(faucetConfig.ethTxMaxFee);
    let nativeNeeded = gasReserve + (this.tokenState ? plan.nativeSpend : 0n);
    if(this.walletState.nativeBalance <= nativeNeeded)
      throw new Error("native balance " + this.walletState.nativeBalance.toString() + " does not cover the transaction's gas" + (this.tokenState && plan.value > 0n ? " and value" : "") + " (" + nativeNeeded.toString() + ")");
    if(this.walletState.balance - BigInt(faucetConfig.spareFundsAmount) < totalAmount)
      throw new Error("payout of " + totalAmount.toString() + " would dip into the spare funds");
  }

  /**
   * Broadcast a signed claim transaction and watch for its receipt. Transport errors retry the
   * same bytes; "already known" and friends count as sent. A definite rejection frees the nonce
   * again (wallet state reload) and throws.
   */
  public async broadcastClaimTx(prepared: PreparedClaimTx, accountForPayout: boolean): Promise<ClaimTransactionResult> {
    let sent = await this.broadcastSigned(prepared.txHex, prepared.txHash);

    if(accountForPayout) {
      let totalAmount = prepared.claims.reduce((sum, claim) => sum + BigInt(claim.amount), 0n);
      this.walletState.balance -= this.tokenState ? totalAmount : prepared.plan.nativeSpend;
      this.walletState.nativeBalance -= prepared.plan.nativeSpend;
      this.updateFaucetStatus();
    }
    return {
      txHash: prepared.txHash,
      txPromise: this.awaitTransactionReceipt(prepared.txHash, prepared.txNonce, prepared.txHex, sent === "uncertain").then((receipt) => this.txResultFromReceipt(receipt)),
      plan: prepared.plan,
    };
  }

  /**
   * After a restart: a signed transaction found in the session rows goes out again (the node
   * ignores bytes it has seen) and its receipt is awaited. Balances are reloaded afterwards, so
   * nothing is deducted here.
   */
  public rebroadcastClaimTx(stored: { txHash: string; txNonce: number; txHex: string }, claims: EthClaimInfo[]): Promise<ClaimTransactionResult> {
    let plan: ClaimTxPlan = { to: "", value: 0n, nativeSpend: 0n, data: "0x", gasLimit: 0, claims };
    return this.broadcastClaimTx({ txHash: stored.txHash, txNonce: stored.txNonce, txHex: stored.txHex, plan, claims }, false);
  }

  public async sendCustomTx(target: string, amount: bigint, data?: string, gasLimit?: number): Promise<TransactionResult> {
    let nonce = this.walletState.nonce;
    let txHex = await this.buildEthTx(target, amount, nonce, data, gasLimit);
    return this.sendSigned(txHex, nonce, 1);
  }

  /**
   * An EIP-7702 set-code transaction from the wallet to itself, delegating the wallet's code to
   * `delegate`. The authorization is processed after the transaction's own nonce, so it carries
   * nonce + 1 and the account ends up two nonces further.
   */
  public async sendSetCodeTx(delegate: string, gasLimit: number): Promise<TransactionResult> {
    if(faucetConfig.ethLegacyTx)
      throw new Error("EIP-7702 delegation needs EIP-1559 transactions (ethLegacyTx: false)");
    if(this.chainId === null)
      this.setChainId(await this.client.getChainId());
    let nonce = this.walletState.nonce;
    let authorization = await this.signer.signAuthorization(delegate, this.chainId, nonce + 1);
    let signed = await this.signer.signSetCodeTransaction({
      chainId: this.chainId,
      nonce: nonce,
      gasLimit: BigInt(gasLimit),
      maxPriorityFeePerGas: BigInt(faucetConfig.ethTxPrioFee),
      maxFeePerGas: BigInt(faucetConfig.ethTxMaxFee),
      to: this.walletAddr,
      value: 0n,
      data: "0x",
    }, [authorization]);
    return this.sendSigned(signed.substring(2), nonce, 2);
  }

  /** The signed transaction as hex without the 0x prefix (the form the claim data stores). */
  private async buildEthTx(target: string, amount: bigint, nonce: number, data?: string, gasLimit?: number): Promise<string> {
    if(target.match(/^0X/))
      target = "0x" + target.substring(2);
    if(this.chainId === null)
      this.setChainId(await this.client.getChainId());

    let signed: string;
    if(faucetConfig.ethLegacyTx) {
      // legacy transaction
      let gasPrice = await this.client.getGasPrice();
      gasPrice += BigInt(faucetConfig.ethTxPrioFee);
      if(faucetConfig.ethTxMaxFee > 0 && gasPrice > faucetConfig.ethTxMaxFee)
        gasPrice = BigInt(faucetConfig.ethTxMaxFee);

      signed = await this.signer.signLegacyTransaction({
        chainId: this.chainId,
        nonce: nonce,
        gasLimit: BigInt(gasLimit || faucetConfig.ethTxGasLimit),
        gasPrice: gasPrice,
        to: target,
        value: amount,
        data: data || "0x",
      });
    }
    else {
      // eip1559 transaction
      signed = await this.signer.signFeeMarketTransaction({
        chainId: this.chainId,
        nonce: nonce,
        gasLimit: BigInt(gasLimit || faucetConfig.ethTxGasLimit),
        maxPriorityFeePerGas: BigInt(faucetConfig.ethTxPrioFee),
        maxFeePerGas: BigInt(faucetConfig.ethTxMaxFee),
        to: target,
        value: amount,
        data: data || "0x",
      });
    }
    return signed.substring(2);
  }

  /**
   * Every signed transaction leaves through here. Transport errors retry the identical bytes;
   * "already known" and friends count as sent; a definite rejection reloads the wallet state (the
   * nonce is free again, or was taken: the reload knows) and throws. The hash is the local one, so
   * a lost answer never leads to a second transaction for the same payout.
   */
  private async broadcastSigned(txHex: string, txHash: string): Promise<"accepted" | "uncertain"> {
    let attempt = 0;
    let hadAmbiguous = false;
    while(true) {
      let outcome = await this.rpcPool.broadcastSignedTransaction("0x" + txHex);
      if(outcome.status === "accepted")
        return "accepted";
      let errorText = rpcErrorString(outcome.error);
      if(outcome.status === "rejected" && !hadAmbiguous) {
        // every endpoint said no, and nothing before this could have taken it: the bytes are nowhere
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "TX " + txHash + " was rejected: " + errorText);
        await this.loadWalletState();
        throw new TransactionRejectedError(errorText);
      }
      // ambiguous (or rejected after an ambiguous attempt): the bytes may sit in a mempool
      hadAmbiguous = true;
      if(attempt++ < 3) {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Broadcasting TX " + txHash + " got no answer [try: " + attempt + "]: " + errorText);
        await sleepPromise(2000); // wait 2 secs and try again with the same bytes - maybe EL client is busy...
        continue;
      }
      // not confirmed, not refused: it stays pending, the receipt watch keeps sending these bytes
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "TX " + txHash + " got no answer from the network " + attempt + " times, keeping it pending: " + errorText);
      return "uncertain";
    }
  }

  /** Sign once, broadcast with the safe retry semantics, reserve `nonces` nonces, watch the receipt. */
  private async sendSigned(txHex: string, txNonce: number, nonces: number): Promise<TransactionResult> {
    let txHash = keccak256(("0x" + txHex) as Hex);
    let sent = await this.broadcastSigned(txHex, txHash);
    this.walletState.nonce += nonces;
    return {
      txHash: txHash,
      txPromise: this.awaitTransactionReceipt(txHash, txNonce, txHex, sent === "uncertain").then((receipt) => this.txResultFromReceipt(receipt)),
    };
  }

  /** 12 s between receipt polls, 3 s while the wallet is delegated (one transaction in flight, see BATCHING_RECEIPT_POLL_INTERVAL). */
  private receiptPollInterval(): number {
    if(this.claimTxBuilder?.isBatchActive())
      return Math.min(this.txReceiptPollInterval, EthWalletManager.BATCHING_RECEIPT_POLL_INTERVAL);
    return this.txReceiptPollInterval;
  }

  /**
   * Poll for the receipt. On a poll without one the same bytes go out again when the node does not
   * know the transaction (a pool that evicted or never got it) or, with `resendEveryPoll`, when no
   * node confirmed the broadcast in the first place. A node that has the bytes ignores the repeat,
   * so re-sending is always safe. The transaction counts as dropped only when
   * DROPPED_CONFIRMATION_POLLS polls in a row saw the nonce spent and no receipt: one poll may well
   * see a nonce from one endpoint ahead of a receipt from another.
   */
  private async awaitTransactionReceipt(txhash: string, txnonce: number, txHex?: string, resendEveryPoll: boolean = false): Promise<EthTxReceipt> {
    let nonceSpentPolls = 0;
    let pollErrors = 0;
    while(true) {
      try {
        let receipt = await this.client.getTransactionReceipt(txhash);
        if(receipt)
          return receipt;
        if(txHex && (resendEveryPoll || !(await this.client.knowsTransaction(txhash))))
          await this.rpcPool.broadcastSignedTransaction("0x" + txHex); // outcome irrelevant here: the receipt decides
        // null: still pending, unless the nonce is spent: then another transaction took the slot
        // (a replacement, or a send whose answer was lost but whose bytes were not these)
        if(typeof txnonce === "number") {
          let minedNonce = await this.client.getTransactionCount(this.walletAddr, "latest");
          nonceSpentPolls = minedNonce > txnonce ? nonceSpentPolls + 1 : 0;
          if(nonceSpentPolls >= DROPPED_CONFIRMATION_POLLS) {
            receipt = await this.client.getTransactionReceipt(txhash); // it may have just been mined
            if(receipt)
              return receipt;
            throw new TransactionDroppedError("transaction " + txhash + " was dropped: nonce " + txnonce + " was spent by another transaction");
          }
        }
      } catch(ex) {
        if(ex instanceof TransactionDroppedError)
          throw ex; // the one verdict this loop reaches on its own
        // No answer about the receipt is not an answer about the transaction: it is broadcast, and
        // it may well be mined (geth answers "transaction indexing is in progress" while its index
        // lags, a 200-claim batch was once marked failed on that although it had paid). Only a
        // receipt or a spent nonce settles the claims; the error is logged and the poll goes on.
        pollErrors++;
        if(!isTransportError(ex) && (pollErrors === 1 || pollErrors % 20 === 0))
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Error while polling transaction receipt for " + txhash + " (" + pollErrors + "x, keeps polling): " + rpcErrorString(ex));
      }

      await sleepPromise(this.receiptPollInterval());
    }
  }

}
