import Web3, { ContractAbi, AbiFragment, TransactionReceipt, TransactionNotFound } from 'web3';
import * as EthCom from '@ethereumjs/common';
import * as EthTx from '@ethereumjs/tx';
import * as EthUtil from 'ethereumjs-util';
import { Contract } from 'web3-eth-contract';
import { ethRpcMethods } from 'web3-rpc-methods';
import { faucetConfig } from '../config/FaucetConfig.js';
import { ServiceManager } from '../common/ServiceManager.js';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess.js';
import { FaucetStatus, FaucetStatusLevel } from '../services/FaucetStatus.js';
import { strFormatPlaceholder } from '../utils/StringUtils.js';
import { sleepPromise } from '../utils/PromiseUtils.js';
import { EthClaimInfo } from './EthClaimManager.js';
import { Erc20Abi } from '../abi/ERC20.js';
import IpcProvider from 'web3-providers-ipc';

export interface WalletState {
  ready: boolean;
  nonce: number;
  balance: bigint;
  nativeBalance: bigint;
}

interface FaucetTokenState {
  address: string;
  decimals: number;
  contract: Contract<ContractAbi>;
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
    receipt: TransactionReceipt;
  }>;
}

export class EthWalletManager {
  public static getWeb3Provider(rpcHost: any): any {
    if(rpcHost && typeof rpcHost === "object")
      return rpcHost as any;
    else if(rpcHost.match(/^wss?:\/\//))
      return new Web3.providers.WebsocketProvider(rpcHost);
    else if(rpcHost.match(/^\//))
      return new IpcProvider(rpcHost);
    else
      return new Web3.providers.HttpProvider(rpcHost);
  }

  private initialized: boolean;
  private web3: Web3;
  private chainCommon: EthCom.Common;
  private walletKey: Buffer;
  private walletAddr: string;
  private walletState: WalletState;
  private tokenState: FaucetTokenState;
  private lastWalletRefresh: number;
  private txReceiptPollInterval = 12000;

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

    this.startWeb3();
    if(typeof faucetConfig.ethChainId === "number")
      this.initChainCommon(BigInt(faucetConfig.ethChainId));

    let privkey = faucetConfig.ethWalletKey;
    if(privkey.match(/^0x/))
      privkey = privkey.substring(2);
    this.walletKey = Buffer.from(privkey, "hex");
    this.walletAddr = faucetConfig.ethWalletAddr;

    await this.loadWalletState();

    // reload handler
    ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
      this.startWeb3();
      this.lastWalletRefresh = 0;
    });
  }

  private initChainCommon(chainId: bigint) {
    if(this.chainCommon && this.chainCommon.chainId() === chainId)
      return;
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Web3 ChainCommon initialized with chainId " + chainId);
    this.chainCommon = EthCom.Common.custom({
      networkId: chainId,
      chainId,
    });
  }

  private startWeb3() {
    const provider = EthWalletManager.getWeb3Provider(faucetConfig.ethRpcHost);
    this.web3 = new Web3(provider);

    if(faucetConfig.faucetCoinType !== FaucetCoinType.NATIVE)
      this.initWeb3Token();
    else
      this.tokenState = null;

    try {
      provider.on('error', e => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Web3 provider error: " + e.toString());
      });
      provider.on('end', () => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Web3 connection lost...");
        this.web3 = null;

        setTimeout(() => {
          this.startWeb3();
        }, 2000);
      });
    } catch(ex) {
      // Do nothing
    }
  }

  private initWeb3Token() {
    switch(faucetConfig.faucetCoinType) {
      case FaucetCoinType.ERC20:
        const tokenContract = new this.web3.eth.Contract(Erc20Abi, faucetConfig.faucetCoinContract, {
          from: this.walletAddr,
        });
        this.tokenState = {
          address: faucetConfig.faucetCoinContract,
          contract: tokenContract,
          decimals: 0,
          getBalance: (addr: string) => tokenContract.methods.balanceOf(addr).call(),
          getTransferData: (addr: string, amount: bigint) => tokenContract.methods.transfer(addr, amount).encodeABI(),
        };
        tokenContract.methods.decimals().call().then((res) => {
          this.tokenState.decimals = Number(res);
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
    const chainIdPromise = typeof faucetConfig.ethChainId === "number" ? Promise.resolve(faucetConfig.ethChainId) : this.web3.eth.getChainId();
    const tokenBalancePromise = this.tokenState?.getBalance(this.walletAddr);
    return Promise.all([
      this.getFaucetWalletBalance("pending"),
      this.web3.eth.getTransactionCount(this.walletAddr, "pending"),
      chainIdPromise,
      tokenBalancePromise,
    ]).catch((ex) => {
      if(ex.toString().match(/"pending" is not yet supported/)) {
        return Promise.all([
          this.getFaucetWalletBalance(),
          this.web3.eth.getTransactionCount(this.walletAddr),
          chainIdPromise,
          tokenBalancePromise,
        ]);
      }
      else
        throw ex;
    }).then((res) => {
      this.initChainCommon(BigInt(res[2]));
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
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error loading wallet state for " + this.walletAddr + ": " + err.toString());
    }).then(() => {
      this.updateFaucetStatus();
    });
  }

  private async updateFaucetStatus() {
    let statusMessage: string = null;
    let statusLevel: FaucetStatusLevel = null;
    if(this.walletState) {
      if(!this.walletState.ready) {
        if(typeof faucetConfig.rpcConnectionError === "string")
          statusMessage = faucetConfig.rpcConnectionError;
        else if(faucetConfig.rpcConnectionError)
          statusMessage = "The faucet could not connect to the network RPC";
        if(statusMessage) {
          statusMessage = strFormatPlaceholder(statusMessage);
          statusLevel = FaucetStatusLevel.ERROR;
        }
      }

      const gasLimit = await this.getGasLimitForClaimTx({
        nonce: this.walletState.nonce, target: this.walletAddr, amount: BigInt(faucetConfig.maxDropAmount)
      });

      if(!statusLevel && (
        this.walletState.balance <= faucetConfig.noFundsBalance ||
        this.walletState.nativeBalance <= BigInt(gasLimit) * BigInt(faucetConfig.ethTxMaxFee)
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
    const decimals = this.getFaucetDecimals(native);
    const factor = Math.pow(10, decimals);
    // tslint:disable-next-line:radix
    return parseInt(amount.toString()) / factor;
  }

  public readableAmount(amount: bigint, native?: boolean): string {
    const amountStr = (Math.floor(this.decimalUnitAmount(amount, native) * 1000) / 1000).toString();
    return amountStr + " " + (native ? "ETH" : faucetConfig.faucetCoinSymbol);
  }

  public async getWalletBalance(addr: string): Promise<bigint> {
    if(this.tokenState)
      return await this.tokenState.getBalance(addr);
    else
      return BigInt(await this.web3.eth.getBalance(addr));
  }

  public async getFaucetWalletBalance(blockNumber?: string) {
    return this.web3.eth.getBalance(this.walletAddr, blockNumber)
  }

  public checkIsContract(addr: string): Promise<boolean> {
    return this.web3.eth.getCode(addr).then((res) => res && !!res.match(/^0x[0-9a-f]{2,}$/));
  }

  public getFaucetBalance(native?: boolean): bigint | null {
    if(native)
      return this.walletState?.nativeBalance;
    else
      return this.walletState?.balance;
  }

  public getContractInterface(addr: string, abi: AbiFragment[]): Contract<ContractAbi> {
    return new this.web3.eth.Contract(abi, addr, {
      from: this.walletAddr,
    });
  }

  public async watchClaimTx(claimInfo: EthClaimInfo): Promise<{
    status: boolean;
    block: number;
    fee: bigint;
    receipt: TransactionReceipt;
  }> {
    return this.awaitTransactionReceipt(claimInfo.claim.txHash, claimInfo.claim.txNonce).then((receipt) => {
      const txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
      this.walletState.nativeBalance -= txfee;
      if(!this.tokenState)
        this.walletState.balance -= txfee;
      return {
        status: Number(receipt.status) > 0,
        block: Number(receipt.blockNumber),
        fee: txfee,
        receipt,
      };
    });
  }

  public async sendClaimTx(claimInfo: EthClaimInfo): Promise<TransactionResult> {
    let txPromise: Promise<TransactionReceipt>;
    let retryCount = 0;
    let txError: Error;
    const buildTx = () => {
      claimInfo.claim.txNonce = this.walletState.nonce;
      if(this.tokenState)
        return this.buildClaimTx({
          target: this.tokenState.address,
          amount: 0n,
          nonce: claimInfo.claim.txNonce,
          data: this.tokenState.getTransferData(claimInfo.target, BigInt(claimInfo.amount))
        });
      else
        return this.buildClaimTx({
          target: claimInfo.target,
          amount: BigInt(claimInfo.amount),
          nonce: claimInfo.claim.txNonce}
        );
    };

    do {
      try {
        claimInfo.claim.txHex = await buildTx();
        const txResult = await this.sendTransaction(claimInfo.claim.txHex, claimInfo.claim.txNonce);
        claimInfo.claim.txHash = txResult[0];
        txPromise = txResult[1];
      } catch(ex) {
        if(!txError)
          txError = ex;
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Sending TX for " + claimInfo.target + " failed [try: " + retryCount + "]: " + ex.toString());
        await sleepPromise(2000); // wait 2 secs and try again - maybe EL client is busy...
        await this.loadWalletState();
      }
    } while(!txPromise && retryCount++ < 3);
    if(!txPromise)
      throw txError;

    this.walletState.nonce++;
    this.walletState.balance -= BigInt(claimInfo.amount);
    if(!this.tokenState)
      this.walletState.nativeBalance -= BigInt(claimInfo.amount);
    this.updateFaucetStatus();
    return {
      txHash: claimInfo.claim.txHash,
      txPromise : txPromise.then((receipt) => {
        const txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
        this.walletState.nativeBalance -= txfee;
        if(!this.tokenState)
          this.walletState.balance -= txfee;
        return {
          status: Number(receipt.status) > 0,
          block: Number(receipt.blockNumber),
          fee: txfee,
          receipt,
        };
      }),
    };
  }

  public async sendCustomTx(params: {target: string, amount: bigint, data?: string, gasLimit: number}): Promise<TransactionResult> {
    const {target, amount, data, gasLimit} = params;
    const txHex = await this.buildEthTx({
      target, amount, nonce: this.walletState.nonce, data, gasLimit
    });
    const txResult = await this.sendTransaction(txHex, this.walletState.nonce);
    this.walletState.nonce++;
    return {
      txHash: txResult[0],
      txPromise : txResult[1].then((receipt) => {
        const txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
        this.walletState.nativeBalance -= txfee;
        if(!this.tokenState)
          this.walletState.balance -= txfee;
        return {
          status: Number(receipt.status) > 0,
          block: Number(receipt.blockNumber),
          fee: txfee,
          receipt,
        };
      }),
    };
  }

  private getTxParams({target, amount, data = '0x', ...restParams }: {target: string, amount: bigint, nonce: number, data?: string}) {
    const to = target.match(/^0X/) ? "0x" + target.substring(2) : target;
    const value = "0x" + amount.toString(16);
    return {to, value, data, ...restParams};
  }

  public getApproximateGasLimitForClaimTx() {
    return this.getGasLimitForClaimTx({
      nonce: this.walletState.nonce, target: this.walletAddr, amount: BigInt(faucetConfig.maxDropAmount)
    });
  }

  private getGasLimitForClaimTx(params: {target: string, amount: bigint, nonce: number, data?: string}) {
    const {to, value, data,  nonce } = this.getTxParams(params)

    return faucetConfig.ethTxGasLimit ? faucetConfig.ethTxGasLimit : this.web3.eth.estimateGas({
      nonce, to, value, data, from: this.walletAddr
    });
  }

  private async buildClaimTx(params: {target: string, amount: bigint, nonce: number, data?: string}): Promise<string> {
    const gasLimit = await this.getGasLimitForClaimTx(params);

    return this.buildEthTx({ ...params, gasLimit})
  }

  private async buildEthTx(params: {target: string, amount: bigint, nonce: number, data?: string, gasLimit: number | bigint}): Promise<string> {
    const {to, value, data,  nonce } = this.getTxParams(params);

    let tx = EthTx.FeeMarketEIP1559Transaction.fromTxData({
      nonce,
      gasLimit: params.gasLimit,
      maxPriorityFeePerGas: faucetConfig.ethTxPrioFee,
      maxFeePerGas: faucetConfig.ethTxMaxFee,
      to,
      value,
      data,
    }, {
      common: this.chainCommon
    });

    tx = tx.sign(this.walletKey);
    return Buffer.from(tx.serialize()).toString('hex');
  }

  private async sendTransaction(txhex: string, txnonce: number): Promise<[string, Promise<TransactionReceipt>]> {
    const txHash = await ethRpcMethods.sendRawTransaction(this.web3.eth.requestManager, "0x" + txhex);

    return [txHash, this.awaitTransactionReceipt(txHash, txnonce)];
  }

  /*
  private async sendTransaction(txhex: string, nonce: number): Promise<[string, Promise<TransactionReceipt>]> {
    let txhashDfd = new PromiseDfd<string>();
    let receiptDfd = new PromiseDfd<TransactionReceipt>();
    let txStatus = 0;

    let txPromise = this.web3.eth.sendSignedTransaction("0x" + txhex);
    txPromise.once('transactionHash', (hash) => {
      txStatus = 1;
      txhashDfd.resolve(hash);
    });
    txPromise.once('receipt', (receipt) => {
      txStatus = 2;
      receiptDfd.resolve(receipt);
    });

    let errorHandler = (error) => {
      if(txStatus === 0)
        txhashDfd.reject(error);
      else
        receiptDfd.reject(error);
    };
    txPromise.on('error', errorHandler);
    txPromise.catch(errorHandler);

    let txHash = await txhashDfd.promise;
    return [txHash, receiptDfd.promise];
  }
  */

  private async awaitTransactionReceipt(txhash: string, _txnonce: number): Promise<TransactionReceipt> {

    while(true) {
      try {
        return await this.web3.eth.getTransactionReceipt(txhash);
      } catch(ex) {
        if(ex instanceof TransactionNotFound || ex.toString().match(/CONNECTION ERROR/) || ex.toString().match(/invalid json response/)) {
          // just retry when RPC connection issue
        } else {
          ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error while polling transaction receipt for " + txhash + ": " + ex.toString());
          console.log("err ", ex);
          throw ex;
        }
      }

      await sleepPromise(this.txReceiptPollInterval); // 12 secs
    }
  }

}
