import { faucetConfig } from '../config/FaucetConfig.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';
import { FaucetStatus, FaucetStatusLevel } from '../services/FaucetStatus.js';
import { strFormatPlaceholder } from '../utils/StringUtils.js';
import { sleepPromise } from '../utils/PromiseUtils.js';
import { EthClaimInfo } from './EthClaimManager.js';
import { Erc20Abi } from '../abi/ERC20.js';
import { RpcEndpointPool } from './RpcEndpointPool.js';
import { ContractAbiInput, ContractCaller, EthSigner, EthTxReceipt, IEthRpcClient, isTransportError, rpcErrorString } from "./rpc/index.js";
import { ClaimTxBuilder, ClaimTxPlan } from './claimtx/ClaimTxBuilder.js';

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

export class EthWalletManager {

  private initialized: boolean;
  private rpcPool: RpcEndpointPool;
  private chainId: number | null = null;
  private signer: EthSigner;
  private walletAddr: string;
  private walletState: WalletState;
  private tokenState: FaucetTokenState;
  private claimTxBuilder: ClaimTxBuilder | null = null;
  private lastWalletRefresh: number;
  private txReceiptPollInterval = 12000;

  /** the pool's routing client: each call goes to the highest-priority ready endpoint at that moment */
  private get client(): IEthRpcClient {
    return this.rpcPool.getClient();
  }

  public getRpcPool(): RpcEndpointPool {
    return this.rpcPool;
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
  }

  /** How claims become transactions: the plain transfer, or the operator's ethClaimTx template. */
  public getClaimTxBuilder(): ClaimTxBuilder {
    if(!this.claimTxBuilder) {
      // the client is only needed for gas estimation; a manager that never initialized (tests stub the sends) has no pool
      let client = this.rpcPool ? this.rpcPool.getClient() : null;
      this.claimTxBuilder = new ClaimTxBuilder(client, this.walletAddr, this.tokenState ? this.tokenState.address : null, faucetConfig.ethClaimTx);
    }
    return this.claimTxBuilder;
  }

  /** Recipients a mined claim transaction reported as not paid (lower-cased); empty without a template that names a failed event. */
  public evaluateClaimReceipt(receipt: EthTxReceipt): Set<string> {
    if(!faucetConfig.ethClaimTx?.batch?.failedEvent || !this.rpcPool)
      return new Set<string>();
    return this.getClaimTxBuilder().evaluateReceipt(receipt.logs).failedTargets;
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
    return this.awaitTransactionReceipt(claimInfo.claim.txHash, claimInfo.claim.txNonce).then((receipt) => this.txResultFromReceipt(receipt));
  }

  public sendClaimTx(claimInfo: EthClaimInfo): Promise<ClaimTransactionResult> {
    return this.sendClaimBatch([claimInfo]);
  }

  /**
   * Pay these claims with one transaction. One claim is the plain transfer (or the template's
   * single-claim call); several need a template with a batch block. Every claim gets the nonce
   * and hash; the signed transaction hex is kept on the first one only.
   */
  public async sendClaimBatch(claims: EthClaimInfo[]): Promise<ClaimTransactionResult> {
    let txPromise: Promise<EthTxReceipt>;
    let retryCount = 0;
    let txError: Error;
    let plan: ClaimTxPlan;
    let totalAmount = claims.reduce((sum, claim) => sum + BigInt(claim.amount), 0n);
    let targetLabel = claims.length === 1 ? claims[0].target : claims.length + " claims";

    do {
      try {
        plan = await this.getClaimTxBuilder().buildPlan(claims);
        let nonce = this.walletState.nonce;
        let txHex = await this.buildEthTx(plan.to, plan.value, nonce, plan.data, plan.gasLimit);
        claims.forEach((claim, idx) => {
          claim.claim.txNonce = nonce;
          claim.claim.txHex = idx === 0 ? txHex : undefined;
        });
        let txResult = await this.sendTransaction(txHex, nonce);
        claims.forEach((claim) => claim.claim.txHash = txResult[0]);
        txPromise = txResult[1];
      } catch(ex) {
        if(!txError)
          txError = ex;
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Sending TX for " + targetLabel + " failed [try: " + retryCount + "]: " + rpcErrorString(ex));
        await sleepPromise(2000); // wait 2 secs and try again - maybe EL client is busy...
        await this.loadWalletState();
      }
    } while(!txPromise && retryCount++ < 3);
    if(!txPromise)
      throw txError;

    this.walletState.nonce++;
    this.walletState.balance -= totalAmount;
    if(!this.tokenState)
      this.walletState.nativeBalance -= plan.value;
    this.updateFaucetStatus();
    return {
      txHash: claims[0].claim.txHash,
      txPromise : txPromise.then((receipt) => this.txResultFromReceipt(receipt)),
      plan: plan,
    };
  }

  public async sendCustomTx(target: string, amount: bigint, data?: string, gasLimit?: number): Promise<TransactionResult> {
    let txHex = await this.buildEthTx(target, amount, this.walletState.nonce, data, gasLimit);
    let txResult = await this.sendTransaction(txHex, this.walletState.nonce);
    this.walletState.nonce++;
    return {
      txHash: txResult[0],
      txPromise : txResult[1].then((receipt) => this.txResultFromReceipt(receipt)),
    };
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

  private async sendTransaction(txhex: string, txnonce: number): Promise<[string, Promise<EthTxReceipt>]> {
    let txHash = await this.rpcPool.broadcastSendRawTransaction("0x" + txhex);

    return [txHash, this.awaitTransactionReceipt(txHash, txnonce)];
  }

  private async awaitTransactionReceipt(txhash: string, txnonce: number): Promise<EthTxReceipt> {
    while(true) {
      try {
        let receipt = await this.client.getTransactionReceipt(txhash);
        if(receipt)
          return receipt;
        // null: still pending
      } catch(ex) {
        if(isTransportError(ex)) {
          // just retry when RPC connection issue (the tx is already broadcast, a transport error on one poll says nothing about it)
        } else {
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error while polling transaction receipt for " + txhash + ": " + rpcErrorString(ex));
          throw ex;
        }
      }

      await sleepPromise(this.txReceiptPollInterval); // 12 secs
    }
  }

}
