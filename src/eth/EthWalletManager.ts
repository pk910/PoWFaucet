
import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import { AbiItem } from 'web3-utils';
import net from 'net';
import { TransactionReceipt } from 'web3-core';
import * as EthCom from '@ethereumjs/common';
import * as EthTx from '@ethereumjs/tx';
import * as EthUtil from 'ethereumjs-util';
import { faucetConfig } from '../config/FaucetConfig';
import { ServiceManager } from '../common/ServiceManager';
import { FaucetProcess, FaucetLogLevel } from '../common/FaucetProcess';
import { FaucetStatus, FaucetStatusLevel } from '../services/FaucetStatus';
import { strFormatPlaceholder } from '../utils/StringUtils';
import { PromiseDfd } from '../utils/PromiseDfd';
import ERC20_ABI from '../abi/ERC20.json';
import { sleepPromise } from '../utils/SleepPromise';
import { EthClaimInfo } from './EthClaimManager';

export interface WalletState {
  ready: boolean;
  nonce: number;
  balance: bigint;
  nativeBalance: bigint;
}

interface FaucetTokenState {
  address: string;
  decimals: number;
  contract: Contract;
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
      return new Web3.providers.IpcProvider(rpcHost, net);
    else
      return new Web3.providers.HttpProvider(rpcHost);
  }

  private initialized: boolean;
  private web3: Web3;
  private chainCommon: EthCom.default;
  private walletKey: Buffer;
  private walletAddr: string;
  private walletState: WalletState;
  private tokenState: FaucetTokenState;
  private lastWalletRefresh: number;
  private txReceiptPollInterval = 30000;

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
      this.initChainCommon(faucetConfig.ethChainId);
    
    let privkey = faucetConfig.ethWalletKey;
    if(privkey.match(/^0x/))
      privkey = privkey.substring(2);
    this.walletKey = Buffer.from(privkey, "hex");
    this.walletAddr = EthUtil.toChecksumAddress("0x"+EthUtil.privateToAddress(this.walletKey).toString("hex"));

    await this.loadWalletState();

    // reload handler
    ServiceManager.GetService(FaucetProcess).addListener("reload", () => {
      this.startWeb3();
      this.lastWalletRefresh = 0;
    });
  }

  private initChainCommon(chainId: number) {
    if(this.chainCommon && this.chainCommon.chainIdBN().toNumber() === chainId)
      return;
    ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, "Web3 ChainCommon initialized with chainId " + chainId);
    this.chainCommon = EthCom.default.forCustomChain('mainnet', {
      networkId: chainId,
      chainId: chainId,
    }, 'london');
  }

  private startWeb3() {
    let provider = EthWalletManager.getWeb3Provider(faucetConfig.ethRpcHost);
    this.web3 = new Web3(provider);

    if(faucetConfig.faucetCoinType !== FaucetCoinType.NATIVE)
      this.initWeb3Token();
    else
      this.tokenState = null;

    if(provider.on) {
      provider.on('error', e => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Web3 provider error: " + e.toString());
      });
      provider.on('end', e => {
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Web3 connection lost...");
        this.web3 = null;

        setTimeout(() => {
          this.startWeb3();
        }, 2000);
      });
    }
  }

  private initWeb3Token() {
    let tokenContract: Contract = null;
    switch(faucetConfig.faucetCoinType) {
      case FaucetCoinType.ERC20:
        tokenContract = new this.web3.eth.Contract(ERC20_ABI as AbiItem[], faucetConfig.faucetCoinContract, {
          from: this.walletAddr,
        });
        this.tokenState = {
          address: faucetConfig.faucetCoinContract,
          contract: tokenContract,
          decimals: 0,
          getBalance: (addr: string) => tokenContract.methods['balanceOf'](addr).call(),
          getTransferData: (addr: string, amount: bigint) => tokenContract.methods['transfer'](addr, amount).encodeABI(),
        };
        tokenContract.methods['decimals']().call().then((res) => {
          this.tokenState.decimals = parseInt(res);
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
    let chainIdPromise = typeof faucetConfig.ethChainId === "number" ? Promise.resolve(faucetConfig.ethChainId) : this.web3.eth.getChainId();
    let tokenBalancePromise = this.tokenState?.getBalance(this.walletAddr);
    return Promise.all([
      this.web3.eth.getBalance(this.walletAddr, "pending"),
      this.web3.eth.getTransactionCount(this.walletAddr, "pending"),
      chainIdPromise,
      tokenBalancePromise,
    ]).catch((ex) => {
      if(ex.toString().match(/"pending" is not yet supported/)) {
        return Promise.all([
          this.web3.eth.getBalance(this.walletAddr),
          this.web3.eth.getTransactionCount(this.walletAddr),
          chainIdPromise,
          tokenBalancePromise,
        ]);
      }
      else
        throw ex;
    }).then((res) => {
      this.initChainCommon(res[2]);
      Object.assign(this.walletState, {
        ready: true,
        balance: this.tokenState ? BigInt(res[3]) : BigInt(res[0]),
        nativeBalance: BigInt(res[0]),
        nonce: res[1],
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
      return BigInt(await this.web3.eth.getBalance(addr));
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

  public getContractInterface(addr: string, abi: AbiItem[]): Contract {
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
    return this.awaitTransactionReceipt(claimInfo.claim.txHash).then((receipt) => {
      let txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
      this.walletState.nativeBalance -= txfee;
      if(!this.tokenState)
        this.walletState.balance -= txfee;
      return {
        status: !!receipt.status,
        block: receipt.blockNumber,
        fee: txfee,
        receipt: receipt,
      };
    });
  }

  public async sendClaimTx(claimInfo: EthClaimInfo): Promise<TransactionResult> {
    let txPromise: Promise<TransactionReceipt>;
    let retryCount = 0;
    let txError: Error;
    let buildTx = () => {
      claimInfo.claim.txNonce = this.walletState.nonce;
      if(this.tokenState)
        return this.buildEthTx(this.tokenState.address, 0n, claimInfo.claim.txNonce, this.tokenState.getTransferData(claimInfo.target, BigInt(claimInfo.amount)));
      else
        return this.buildEthTx(claimInfo.target, BigInt(claimInfo.amount), claimInfo.claim.txNonce);
    };

    do {
      try {
        claimInfo.claim.txHex = await buildTx();
        let txResult = await this.sendTransaction(claimInfo.claim.txHex);
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
      txPromise : txPromise.catch((ex) => {
        if(ex.toString().match(/Transaction was not mined within/)) {
          // poll receipt
          return this.awaitTransactionReceipt(claimInfo.claim.txHash);
        }
        else {
          throw ex;
        }
      }).then((receipt) => {
        let txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
        this.walletState.nativeBalance -= txfee;
        if(!this.tokenState)
          this.walletState.balance -= txfee;
        return {
          status: !!receipt.status,
          block: receipt.blockNumber,
          fee: txfee,
          receipt: receipt,
        };
      }),
    };
  }

  public async sendCustomTx(target: string, amount: bigint, data?: string, gasLimit?: number): Promise<TransactionResult> {
    let txHex = await this.buildEthTx(target, amount, this.walletState.nonce, data, gasLimit);
    let txResult = await this.sendTransaction(txHex);
    this.walletState.nonce++;
    return {
      txHash: txResult[0],
      txPromise : txResult[1].catch((ex) => {
        if(ex.toString().match(/Transaction was not mined within/)) {
          // poll receipt
          return this.awaitTransactionReceipt(txResult[0]);
        }
        else {
          throw ex;
        }
      }).then((receipt) => {
        let txfee = BigInt(receipt.effectiveGasPrice) * BigInt(receipt.gasUsed);
        this.walletState.nativeBalance -= txfee;
        if(!this.tokenState)
          this.walletState.balance -= txfee;
        return {
          status: !!receipt.status,
          block: receipt.blockNumber,
          fee: txfee,
          receipt: receipt,
        };
      }),
    };
  }

  private async buildEthTx(target: string, amount: bigint, nonce: number, data?: string, gasLimit?: number): Promise<string> {
    if(target.match(/^0X/))
      target = "0x" + target.substring(2);

    let tx: EthTx.Transaction | EthTx.FeeMarketEIP1559Transaction;
    if(faucetConfig.ethLegacyTx) {
      // legacy transaction
      let gasPrice = parseInt(await this.web3.eth.getGasPrice());
      gasPrice += faucetConfig.ethTxPrioFee;
      if(faucetConfig.ethTxMaxFee > 0 && gasPrice > faucetConfig.ethTxMaxFee)
        gasPrice = faucetConfig.ethTxMaxFee;

      tx = EthTx.Transaction.fromTxData({
        nonce: nonce,
        gasLimit: gasLimit || faucetConfig.ethTxGasLimit,
        gasPrice: gasPrice,
        to: target,
        value: "0x" + amount.toString(16),
        data: data ? data : "0x"
      }, {
        common: this.chainCommon
      });
    }
    else {
      // eip1559 transaction
      tx = EthTx.FeeMarketEIP1559Transaction.fromTxData({
        nonce: nonce,
        gasLimit: gasLimit || faucetConfig.ethTxGasLimit,
        maxPriorityFeePerGas: faucetConfig.ethTxPrioFee,
        maxFeePerGas: faucetConfig.ethTxMaxFee,
        to: target,
        value: "0x" + amount.toString(16),
        data: data ? data : "0x"
      }, {
        common: this.chainCommon
      });
    }

    tx = tx.sign(this.walletKey);
    return tx.serialize().toString('hex');
  }

  private async sendTransaction(txhex: string): Promise<[string, Promise<TransactionReceipt>]> {
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
    txPromise.on('error', (error) => {
      if(txStatus === 0)
        txhashDfd.reject(error);
      else
        receiptDfd.reject(error);
    });

    let txHash = await txhashDfd.promise;
    return [txHash, receiptDfd.promise];
  }

  private async awaitTransactionReceipt(txhash: string): Promise<TransactionReceipt> {
    try {
      let receipt: TransactionReceipt;
      do {
        await sleepPromise(this.txReceiptPollInterval); // 30 secs
        receipt = await this.web3.eth.getTransactionReceipt(txhash);
        ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.WARNING, "Polled transaction receipt for " + txhash + ": " + (receipt ? "found!" : "pending"));
      } while(!receipt);
      return receipt;
    } catch(ex) {
      if(ex.toString().match(/CONNECTION ERROR/)) {
        // just retry when RPC connection issue
        return this.awaitTransactionReceipt(txhash);
      }

      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Error while polling transaction receipt for " + txhash + ": " + ex.toString());
      throw ex;
    }
  }

}
