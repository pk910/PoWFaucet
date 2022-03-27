
import Web3 from 'web3';
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

interface WalletState {
  nonce: number;
  balance: number;
}

export enum ClaimTxStatus {
  QUEUE = "queue",
  PENDING = "pending",
  CONFIRMED = "confirmed",
  FAILED = "failed",
}

enum FucetWalletState {
  UNKNOWN = 0,
  NORMAL = 1,
  LOWFUNDS = 2,
  NOFUNDS = 3
}

interface ClaimTxEvents {
  'pending': () => void;
  'confirmed': () => void;
  'failed': () => void;
}

export class ClaimTx extends TypedEmitter<ClaimTxEvents> {
  public status: ClaimTxStatus;
  public readonly time: Date;
  public readonly target: string;
  public readonly amount: number;
  public nonce: number;
  public txhex: string;
  public txhash: string;
  public txblock: number;
  public retryCount: number;
  public failReason: string;

  public constructor(target: string, amount: number) {
    super();
    this.status = ClaimTxStatus.QUEUE;
    this.time = new Date();
    this.target = target;
    this.amount = amount;
    this.retryCount = 0;
  }
}

export class EthWeb3Manager {
  private web3: Web3;
  private chainCommon: EthCom.default;
  private walletKey: Buffer;
  private walletAddr: string;
  private walletState: WalletState;
  private claimTxQueue: ClaimTx[] = [];
  private pendingTxQueue: {[nonce: number]: ClaimTx} = {};
  private historyTxDict: {[nonce: number]: ClaimTx} = {};
  private lastWalletRefresh: number;
  private faucetStatus = FucetWalletState.UNKNOWN;

  public constructor() {
    this.web3 = new Web3(faucetConfig.ethRpcHost);
    this.chainCommon = EthCom.default.forCustomChain('mainnet', {
      networkId: faucetConfig.ethChainId,
      chainId: faucetConfig.ethChainId,
    }, 'london');
    this.walletKey = Buffer.from(faucetConfig.ethWalletKey, "hex");
    this.walletAddr = EthUtil.toChecksumAddress("0x"+EthUtil.privateToAddress(this.walletKey).toString("hex"));
    
    this.lastWalletRefresh = Math.floor(new Date().getTime() / 1000);
    this.loadWalletState().then(() => {
      setInterval(() => this.processQueue(), 2000);
    });
  }

  public getTransactionQueue(): ClaimTx[] {
    let txlist: ClaimTx[] = [];
    Array.prototype.push.apply(txlist, this.claimTxQueue);
    Array.prototype.push.apply(txlist, Object.values(this.pendingTxQueue));
    Array.prototype.push.apply(txlist, Object.values(this.historyTxDict));
    return txlist;
  }

  private loadWalletState(): Promise<void> {
    return Promise.all([
      this.web3.eth.getBalance(this.walletAddr),
      this.web3.eth.getTransactionCount(this.walletAddr),
    ]).then((res) => {
      this.walletState = {
        balance: parseInt(res[0]),
        nonce: res[1],
      };
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Wallet " + this.walletAddr + ":  " + (Math.round(weiToEth(this.walletState.balance)*1000)/1000) + " ETH  [Nonce: " + this.walletState.nonce + "]");
      this.updateFaucetStatus();
    });
  }

  private updateFaucetStatus() {
    let newStatus = FucetWalletState.UNKNOWN;
    if(this.walletState) {
      newStatus = FucetWalletState.NORMAL;
      if(this.walletState.balance <= faucetConfig.spareFundsAmount)
        newStatus = FucetWalletState.NOFUNDS;
      else if(this.walletState.balance <= faucetConfig.lowFundsBalance)
        newStatus = FucetWalletState.LOWFUNDS;
    }
    if(newStatus !== this.faucetStatus) {
      let statusMessage: string;
      switch(newStatus) {
        case FucetWalletState.LOWFUNDS:
          if(typeof faucetConfig.lowFundsWarning === "string")
            statusMessage = faucetConfig.lowFundsWarning;
          else if(faucetConfig.lowFundsWarning)
            statusMessage = "The faucet is running out of funds! Faucet Balance: {1}";
          else
            break;
          ServiceManager.GetService(FaucetStatus).setFaucetStatus("wallet", strFormatPlaceholder(statusMessage, (Math.round(weiToEth(this.walletState.balance)*1000)/1000) + " ETH"), FaucetStatusLevel.WARNING);
        case FucetWalletState.NOFUNDS:
          if(typeof faucetConfig.noFundsError === "string")
            statusMessage = faucetConfig.noFundsError;
          else if(faucetConfig.noFundsError)
            statusMessage = "The faucet is out of funds!";
          else
            break;
          ServiceManager.GetService(FaucetStatus).setFaucetStatus("wallet", strFormatPlaceholder(statusMessage), FaucetStatusLevel.ERROR);
        default:
          ServiceManager.GetService(FaucetStatus).setFaucetStatus("wallet", null, null);
      }
      this.faucetStatus = newStatus;
    }
  }

  public addClaimTransaction(target: string, amount: number): ClaimTx {
    let claimTx = new ClaimTx(target, amount);
    this.claimTxQueue.push(claimTx);
    return claimTx;
  }

  private buildEthTx(target: string, amount: number): {txhash: string, nonce: number} {
    let txAmount: number|string = amount;
    if(txAmount > 10000000000000000)
      txAmount = "0x" + BigInt(txAmount).toString(16);
    let nonce = this.walletState.nonce++;
    this.walletState.balance -= amount;

    var rawTx = {
      nonce: nonce,
      gasLimit: faucetConfig.ethTxGasLimit,
      maxPriorityFeePerGas: faucetConfig.ethTxPrioFee,
      maxFeePerGas: faucetConfig.ethTxMaxFee,
      from: this.walletAddr,
      to: target,
      value: txAmount
    };
    var tx = EthTx.FeeMarketEIP1559Transaction.fromTxData(rawTx, { common: this.chainCommon });
    tx = tx.sign(this.walletKey);
    return {
      txhash: tx.serialize().toString('hex'),
      nonce: nonce
    };
  }

  private processQueue() {
    let pendingTxCount = Object.keys(this.pendingTxQueue).length;
    while(pendingTxCount < faucetConfig.ethMaxPending && this.claimTxQueue.length > 0) {
      // build tx
      let claimTx = this.claimTxQueue.splice(0, 1)[0];
      this.processQueueTx(claimTx);
    }

    let now = Math.floor(new Date().getTime() / 1000);
    if(pendingTxCount === 0 && Object.keys(this.pendingTxQueue).length === 0 && now - this.lastWalletRefresh > 600) {
      this.lastWalletRefresh = now;
      this.loadWalletState();
    }
  }

  private processQueueTx(claimTx: ClaimTx) {
    if(this.walletState.balance - faucetConfig.spareFundsAmount < claimTx.amount) {
      claimTx.failReason = "Faucet wallet is out of funds.";
      claimTx.status = ClaimTxStatus.FAILED;
      claimTx.emit("failed");
      return;
    }

    let ethtx = this.buildEthTx(claimTx.target, claimTx.amount);
    claimTx.nonce = ethtx.nonce;
    claimTx.txhex = ethtx.txhash;
    claimTx.status = ClaimTxStatus.PENDING;
    claimTx.emit("pending");

    this.updateFaucetStatus();

    this.pendingTxQueue[claimTx.nonce] = claimTx;

    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Sending rewards tx for " + claimTx.target + ":  " + (Math.round(weiToEth(claimTx.amount)*1000)/1000) + " ETH");
    this.sendClaimTx(claimTx).then(() => {
      delete this.pendingTxQueue[claimTx.nonce];
      claimTx.status = ClaimTxStatus.CONFIRMED;
      claimTx.emit("confirmed");
    }, (err) => {
      delete this.pendingTxQueue[claimTx.nonce];
      claimTx.failReason = err;
      claimTx.status = ClaimTxStatus.FAILED;
      claimTx.emit("failed");
    }).then(() => {
      this.historyTxDict[claimTx.nonce] = claimTx;
      setTimeout(() => {
        delete this.historyTxDict[claimTx.nonce];
      }, 30 * 60 * 1000);
    });
  }

  private sendClaimTx(claimTx: ClaimTx): Promise<void> {
    return new Promise((resolve, reject) => {
      let txPromise = this.web3.eth.sendSignedTransaction("0x" + claimTx.txhex);
      txPromise.then((res) => {
        claimTx.txhash = res.transactionHash;
        claimTx.txblock = res.blockNumber;
        resolve();
      }, (err) => {
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.ERROR, "Transaction for " + claimTx.target + " failed: " + err);
        if(claimTx.retryCount < 3) {
          claimTx.retryCount++;
          this.sendClaimTx(claimTx).then(resolve, reject);
        }
        else {
          reject(err);
        }
      });
    });
  }


}
