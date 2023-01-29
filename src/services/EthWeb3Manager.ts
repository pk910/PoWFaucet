
import Web3 from 'web3';
import net from 'net';
import { TransactionReceipt } from 'web3-core';
import * as EthCom from '@ethereumjs/common';
import * as EthTx from '@ethereumjs/tx';
import * as EthUtil from 'ethereumjs-util';
import { TypedEmitter } from 'tiny-typed-emitter';
import { faucetConfig } from '../common/FaucetConfig';
import { weiToEth } from '../utils/ConvertHelpers';
import { ServiceManager } from '../common/ServiceManager';
import { PoWStatusLog, PoWStatusLogLevel } from '../common/PoWStatusLog';
import { FaucetStatus, FaucetStatusLevel } from './FaucetStatus';
import { strFormatPlaceholder } from '../utils/StringUtils';
import { FaucetStatsLog } from './FaucetStatsLog';
import { PromiseDfd } from '../utils/PromiseDfd';
import { FaucetStore } from './FaucetStore';
import { PoWRewardLimiter } from './PoWRewardLimiter';

interface WalletState {
  ready: boolean;
  nonce: number;
  balance: bigint;
}

export enum ClaimTxStatus {
  QUEUE = "queue",
  PROCESSING = "processing",
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
}

enum FucetWalletState {
  UNKNOWN = 0,
  NORMAL = 1,
  LOWFUNDS = 2,
  NOFUNDS = 3,
  OFFLINE = 4,
}

interface ClaimTxEvents {
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
  public status: ClaimTxStatus;
  public readonly time: Date;
  public readonly target: string;
  public readonly amount: bigint;
  public readonly session: string;
  public nonce: number;
  public txhex: string;
  public txhash: string;
  public txblock: number;
  public retryCount: number;
  public failReason: string;

  public constructor(target: string, amount: bigint, sessId: string, date?: number) {
    super();
    this.status = ClaimTxStatus.QUEUE;
    this.time = date ? new Date(date) : new Date();
    this.target = target;
    this.amount = amount;
    this.session = sessId;
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

export class EthWeb3Manager {
  private web3: Web3;
  private chainCommon: EthCom.default;
  private walletKey: Buffer;
  private walletAddr: string;
  private walletState: WalletState;
  private claimTxQueue: ClaimTx[] = [];
  private pendingTxQueue: {[hash: string]: ClaimTx} = {};
  private historyTxDict: {[nonce: number]: ClaimTx} = {};
  private lastWalletRefresh: number;
  private queueProcessing: boolean = false;
  private lastWalletRefill: number;
  private lastWalletRefillTry: number;
  private walletRefilling: boolean;

  public constructor() {
    this.startWeb3();
    if(typeof faucetConfig.ethChainId === "number")
      this.initChainCommon(faucetConfig.ethChainId);
    
    this.walletKey = Buffer.from(faucetConfig.ethWalletKey, "hex");
    this.walletAddr = EthUtil.toChecksumAddress("0x"+EthUtil.privateToAddress(this.walletKey).toString("hex"));

    // restore saved claimTx queue
    ServiceManager.GetService(FaucetStore).getClaimTxQueue().forEach((claimTx) => {
      let claim = new ClaimTx(claimTx.target, BigInt(claimTx.amount), claimTx.session, claimTx.time);
      this.claimTxQueue.push(claim);
    });

    this.loadWalletState().then(() => {
      setInterval(() => this.processQueue(), 2000);
    });
  }

  private initChainCommon(chainId: number) {
    if(this.chainCommon && this.chainCommon.chainIdBN().toNumber() === chainId)
      return;
    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Web3 ChainCommon initialized with chainId " + chainId);
    this.chainCommon = EthCom.default.forCustomChain('mainnet', {
      networkId: chainId,
      chainId: chainId,
    }, 'london');
  }

  private startWeb3() {
    let provider: any;
    if(faucetConfig.ethRpcHost.match(/^wss?:\/\//))
      provider = new Web3.providers.WebsocketProvider(faucetConfig.ethRpcHost);
    else if(faucetConfig.ethRpcHost.match(/^\//))
      provider = new Web3.providers.IpcProvider(faucetConfig.ethRpcHost, net);
    else
      provider = new Web3.providers.HttpProvider(faucetConfig.ethRpcHost);
    
    this.web3 = new Web3(provider);

    if(provider.on) {
      provider.on('error', e => {
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.ERROR, "Web3 provider error: " + e.toString());
      });
      provider.on('end', e => {
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.ERROR, "Web3 connection lost...");
        this.web3 = null;

        setTimeout(() => {
          this.startWeb3();
        }, 2000);
      });
    }
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

  private loadWalletState(): Promise<void> {
    this.lastWalletRefresh = Math.floor(new Date().getTime() / 1000);
    let chainIdPromise = typeof faucetConfig.ethChainId === "number" ? Promise.resolve(faucetConfig.ethChainId) : this.web3.eth.getChainId();
    return Promise.all([
      this.web3.eth.getBalance(this.walletAddr, "pending"),
      this.web3.eth.getTransactionCount(this.walletAddr, "pending"),
      chainIdPromise,
    ]).catch((ex) => {
      if(ex.toString().match(/"pending" is not yet supported/)) {
        return Promise.all([
          this.web3.eth.getBalance(this.walletAddr),
          this.web3.eth.getTransactionCount(this.walletAddr),
          chainIdPromise,
        ]);
      }
      else
        throw ex;
    }).then((res) => {
      this.initChainCommon(res[2]);
      this.walletState = {
        ready: true,
        balance: BigInt(res[0]),
        nonce: res[1],
      };
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Wallet " + this.walletAddr + ":  " + (Math.round(weiToEth(this.walletState.balance)*1000)/1000) + " ETH  [Nonce: " + this.walletState.nonce + "]");
    }, (err) => {
      this.walletState = {
        ready: false,
        balance: 0n,
        nonce: 0,
      };
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.ERROR, "Error loading wallet state for " + this.walletAddr + ": " + err.toString());
    }).then(() => {
      this.updateFaucetStatus();
    });
  }

  private updateFaucetStatus() {
    let newStatus = FucetWalletState.UNKNOWN;
    if(this.walletState) {
      newStatus = FucetWalletState.NORMAL;
      if(!this.walletState.ready)
        newStatus = FucetWalletState.OFFLINE;
      else if(this.walletState.balance <= faucetConfig.spareFundsAmount)
        newStatus = FucetWalletState.NOFUNDS;
      else if(this.walletState.balance <= faucetConfig.lowFundsBalance)
        newStatus = FucetWalletState.LOWFUNDS;
    }
    let statusMessage: string = null;
    let statusLevel: FaucetStatusLevel = null;
    switch(newStatus) {
      case FucetWalletState.LOWFUNDS:
        if(typeof faucetConfig.lowFundsWarning === "string")
          statusMessage = faucetConfig.lowFundsWarning;
        else if(faucetConfig.lowFundsWarning)
          statusMessage = "The faucet is running out of funds! Faucet Balance: {1}";
        else
          break;
        statusMessage = strFormatPlaceholder(statusMessage, (Math.round(weiToEth(this.walletState.balance)*1000)/1000) + " ETH");
        statusLevel = FaucetStatusLevel.WARNING;
        break;
      case FucetWalletState.NOFUNDS:
        if(typeof faucetConfig.noFundsError === "string")
          statusMessage = faucetConfig.noFundsError;
        else if(faucetConfig.noFundsError)
          statusMessage = "The faucet is out of funds!";
        else
          break;
        statusMessage = strFormatPlaceholder(statusMessage);
        statusLevel = FaucetStatusLevel.ERROR;
        break;
      case FucetWalletState.OFFLINE:
        if(typeof faucetConfig.rpcConnectionError === "string")
          statusMessage = faucetConfig.rpcConnectionError;
        else if(faucetConfig.rpcConnectionError)
          statusMessage = "The faucet could not connect to the network RPC";
        else
          break;
        statusMessage = strFormatPlaceholder(statusMessage);
        statusLevel = FaucetStatusLevel.ERROR;
        break;
    }
    ServiceManager.GetService(FaucetStatus).setFaucetStatus("wallet", statusMessage, statusLevel);
  }

  public getFaucetAddress(): string {
    return this.walletAddr;
  }

  public getWalletBalance(addr: string): Promise<bigint> {
    return this.web3.eth.getBalance(addr).then((res) => BigInt(res));
  }

  public checkIsContract(addr: string): Promise<boolean> {
    return this.web3.eth.getCode(addr).then((res) => res && !!res.match(/^0x[0-9a-f]{2,}$/));
  }

  public getFaucetBalance(): bigint | null {
    return this.walletState?.balance || null;
  }

  public addClaimTransaction(target: string, amount: bigint, sessId: string): ClaimTx {
    let claimTx = new ClaimTx(target, amount, sessId);
    this.claimTxQueue.push(claimTx);
    ServiceManager.GetService(FaucetStore).addQueuedClaimTx(claimTx.serialize());
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

  private buildEthTx(target: string, amount: bigint, nonce: number): string {
    if(target.match(/^0X/))
      target = "0x" + target.substring(2);

    var rawTx = {
      nonce: nonce,
      gasLimit: faucetConfig.ethTxGasLimit,
      maxPriorityFeePerGas: faucetConfig.ethTxPrioFee,
      maxFeePerGas: faucetConfig.ethTxMaxFee,
      from: this.walletAddr,
      to: target,
      value: "0x" + amount.toString(16)
    };
    var tx = EthTx.FeeMarketEIP1559Transaction.fromTxData(rawTx, { common: this.chainCommon });
    tx = tx.sign(this.walletKey);
    return tx.serialize().toString('hex');
  }

  private async processQueue() {
    if(this.queueProcessing)
      return;
    this.queueProcessing = true;

    try {
      while(Object.keys(this.pendingTxQueue).length < faucetConfig.ethMaxPending && this.claimTxQueue.length > 0) {
        if(faucetConfig.ethQueueNoFunds && (!this.walletState.ready || this.walletState.balance - BigInt(faucetConfig.spareFundsAmount) < this.claimTxQueue[0].amount)) {
          break; // skip processing (out of funds)
        }

        let claimTx = this.claimTxQueue.splice(0, 1)[0];
        await this.processQueueTx(claimTx);
      }

      let now = Math.floor(new Date().getTime() / 1000);
      let walletRefreshTime = this.walletState.ready ? 600 : 10;
      if(Object.keys(this.pendingTxQueue).length === 0 && now - this.lastWalletRefresh > walletRefreshTime) {
        await this.loadWalletState();
      }

      if(faucetConfig.ethRefillContract && this.walletState.ready)
        await this.tryRefillWallet();
    } catch(ex) {
      let stack;
      try {
        throw new Error();
      } catch(ex) {
        stack = ex.stack;
      }
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.ERROR, "Exception in transaction queue processing: " + ex.toString() + `\r\n   Stack Trace: ${ex && ex.stack ? ex.stack : stack}`);
    }
    this.queueProcessing = false;
  }

  private sleepPromise(delay: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, delay);
    });
  }

  private async processQueueTx(claimTx: ClaimTx) {
    if(!this.walletState.ready) {
      claimTx.failReason = "Network RPC is currently unreachable.";
      claimTx.status = ClaimTxStatus.FAILED;
      claimTx.emit("failed");
      return;
    }
    if(!this.walletState.ready || this.walletState.balance - BigInt(faucetConfig.spareFundsAmount) < claimTx.amount) {
      claimTx.failReason = "Faucet wallet is out of funds.";
      claimTx.status = ClaimTxStatus.FAILED;
      claimTx.emit("failed");
      return;
    }

    try {
      claimTx.status = ClaimTxStatus.PROCESSING;
      claimTx.emit("processing");

      // send transaction
      let txPromise: Promise<TransactionReceipt>;
      let retryCount = 0;
      let txError: Error;
      let buildTx = () => {
        claimTx.nonce = this.walletState.nonce;
        return this.buildEthTx(claimTx.target, claimTx.amount, claimTx.nonce);
      };

      do {
        try {
          let txResult = await this.sendTransaction(buildTx());
          claimTx.txhash = txResult[0];
          txPromise = txResult[1];
        } catch(ex) {
          if(!txError)
            txError = ex;
          ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.ERROR, "Sending TX for " + claimTx.target + " failed [try: " + retryCount + "]: " + ex.toString());
          await this.sleepPromise(2000); // wait 2 secs and try again - maybe EL client is busy...
          await this.loadWalletState();
        }
      } while(!txPromise && retryCount++ < 3);
      if(!txPromise)
        throw txError;

      this.walletState.nonce++;
      this.walletState.balance -= claimTx.amount;
      this.updateFaucetStatus();

      this.pendingTxQueue[claimTx.txhash] = claimTx;
      ServiceManager.GetService(FaucetStore).removeQueuedClaimTx(claimTx.session);
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Submitted claim transaction " + claimTx.session + " [" + (Math.round(weiToEth(claimTx.amount)*1000)/1000) + " ETH] to: " + claimTx.target + ": " + claimTx.txhash);

      claimTx.status = ClaimTxStatus.PENDING;
      claimTx.emit("pending");

      // await transaction receipt
      txPromise.then((receipt) => {
        delete this.pendingTxQueue[claimTx.txhash];
        claimTx.txblock = receipt.blockNumber;
        claimTx.status = ClaimTxStatus.CONFIRMED;
        claimTx.emit("confirmed");
        ServiceManager.GetService(FaucetStatsLog).addClaimStats(claimTx);
      }, (error) => {
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.WARNING, "Transaction for " + claimTx.target + " failed: " + error.toString());
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


  private async tryRefillWallet() {
    if(!faucetConfig.ethRefillContract)
      return;
    if(this.walletRefilling)
      return;
    let now = Math.floor(new Date().getTime() / 1000);
    if(this.lastWalletRefillTry && now - this.lastWalletRefillTry < 60)
      return;
    if(this.lastWalletRefill && faucetConfig.ethRefillContract.cooldownTime && now - this.lastWalletRefill < faucetConfig.ethRefillContract.cooldownTime)
      return;
    this.lastWalletRefillTry = now;

    if(this.walletState.balance - ServiceManager.GetService(PoWRewardLimiter).getUnclaimedBalance() > faucetConfig.ethRefillContract.triggerBalance)
      return;
    
    this.walletRefilling = true;
    try {
      let txResult = await this.refillWallet();
      this.lastWalletRefill = Math.floor(new Date().getTime() / 1000);

      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Sending withdraw transaction to vault contract: " + txResult[0]);

      let txReceipt = await txResult[1];
      if(!txReceipt.status)
        throw txReceipt;

      txResult[1].then((receipt) => {
        this.walletRefilling = false;
        if(!receipt.status)
          throw receipt;
        
        this.loadWalletState(); // refresh balance
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Faucet wallet successfully refilled from vault contract.");
      }).catch((err) => {
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.WARNING, "Faucet wallet refill transaction reverted: " + err.toString());
      });
    } catch(ex) {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.WARNING, "Faucet wallet refill from vault contract failed: " + ex.toString());
      this.walletRefilling = false;
    }
  }

  private async refillWallet(): Promise<[string, Promise<TransactionReceipt>]> {
    let refillContractAbi = JSON.parse(faucetConfig.ethRefillContract.abi);
    let refillContract = new this.web3.eth.Contract(refillContractAbi, faucetConfig.ethRefillContract.contract);

    let refillAmount = faucetConfig.ethRefillContract.requestAmount || 0;
    let refillAllowance: number = null;

    if(faucetConfig.ethRefillContract.allowanceFn) {
      // check allowance
      refillAllowance = await refillContract.methods[faucetConfig.ethRefillContract.allowanceFn](this.walletAddr).call();
      if(refillAllowance == 0)
        throw "no withdrawable funds from refill contract";
      if(refillAmount > refillAllowance)
        refillAmount = refillAllowance;
    }

    if(faucetConfig.ethRefillContract.checkContractBalance) {
      let checkAddr = (typeof faucetConfig.ethRefillContract.checkContractBalance === "string" ? faucetConfig.ethRefillContract.checkContractBalance : faucetConfig.ethRefillContract.contract);
      let contractBalance = parseInt(await this.web3.eth.getBalance(checkAddr));
      if(contractBalance <= (faucetConfig.ethRefillContract.contractDustBalance || 1000000000))
        throw "refill contract is out of funds";
      if(refillAmount > contractBalance)
        refillAmount = contractBalance;
    }

    var rawTx = {
      nonce: this.walletState.nonce,
      gasLimit: faucetConfig.ethRefillContract.withdrawGasLimit || faucetConfig.ethTxGasLimit,
      maxPriorityFeePerGas: faucetConfig.ethTxPrioFee,
      maxFeePerGas: faucetConfig.ethTxMaxFee,
      from: this.walletAddr,
      to: faucetConfig.ethRefillContract.contract,
      value: 0,
      data: refillContract.methods[faucetConfig.ethRefillContract.withdrawFn](BigInt(refillAmount)).encodeABI()
    };
    var tx = EthTx.FeeMarketEIP1559Transaction.fromTxData(rawTx, { common: this.chainCommon });
    tx = tx.sign(this.walletKey);
    let txHex = tx.serialize().toString('hex');

    let txResult = await this.sendTransaction(txHex);
    this.walletState.nonce++;

    return txResult;
  }

  public getFaucetRefillCooldown(): number {
    let now = Math.floor(new Date().getTime() / 1000);
    if(!faucetConfig.ethRefillContract || !faucetConfig.ethRefillContract.cooldownTime)
      return 0;
    if(!this.lastWalletRefill)
      return 0;
    let cooldown = faucetConfig.ethRefillContract.cooldownTime - (now - this.lastWalletRefill);
    if(cooldown < 0)
      return 0;
    return cooldown;
  }

}
