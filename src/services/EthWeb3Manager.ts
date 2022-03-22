
import Web3 from 'web3';
import * as EthCom from '@ethereumjs/common';
import * as EthTx from '@ethereumjs/tx';
import * as EthUtil from 'ethereumjs-util';
import { TypedEmitter } from 'tiny-typed-emitter';
import { faucetConfig } from '../common/FaucetConfig';
import { weiToEth } from '../utils/ConvertHelpers';
import { ServiceManager } from '../common/ServiceManager';
import { PoWStatusLog, PoWStatusLogLevel } from '../common/PoWStatusLog';

interface WalletState {
  nonce: number;
  balance: number;
}

export enum ClaimTxStatus {
  QUEUE,
  PENDING,
  CONFIRMED
}

interface ClaimTxEvents {
  'pending': () => void;
  'confirmed': () => void;
}

export class ClaimTx extends TypedEmitter<ClaimTxEvents> {
  public status: ClaimTxStatus;
  public readonly target: string;
  public readonly amount: number;
  public nonce: number;
  public txhex: string;
  public txhash: string;
  public txblock: number;

  public constructor(target: string, amount: number) {
    super();
    this.status = ClaimTxStatus.QUEUE;
    this.target = target;
    this.amount = amount;
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

  public constructor() {
    this.web3 = new Web3(faucetConfig.ethRpcHost);
    this.chainCommon = EthCom.default.forCustomChain('mainnet', {
      networkId: faucetConfig.ethChainId,
      chainId: faucetConfig.ethChainId,
    }, 'london');
    this.walletKey = Buffer.from(faucetConfig.ethWalletKey, "hex");
    this.walletAddr = EthUtil.toChecksumAddress("0x"+EthUtil.privateToAddress(this.walletKey).toString("hex"));
    
    this.loadWalletState().then(() => {
      ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Wallet " + this.walletAddr + ":  " + (Math.round(weiToEth(this.walletState.balance)*1000)/1000) + " ETH  [Nonce: " + this.walletState.nonce + "]");
      setInterval(() => this.processQueue(), 2000);
    });
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
    });
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
  }

  private processQueueTx(claimTx: ClaimTx) {
    let ethtx = this.buildEthTx(claimTx.target, claimTx.amount);
    claimTx.nonce = ethtx.nonce;
    claimTx.txhex = ethtx.txhash;
    claimTx.status = ClaimTxStatus.PENDING;
    claimTx.emit("pending");

    this.pendingTxQueue[claimTx.nonce] = claimTx;

    ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.INFO, "Sending rewards tx for " + claimTx.target + ":  " + (Math.round(weiToEth(claimTx.amount)*1000)/1000) + " ETH");
    this.sendClaimTx(claimTx).then(() => {
      delete this.pendingTxQueue[claimTx.nonce];
      claimTx.status = ClaimTxStatus.CONFIRMED;
      claimTx.emit("confirmed");
    })
  }

  private sendClaimTx(claimTx: ClaimTx): Promise<void> {
    return new Promise((resolve) => {
      let txPromise = this.web3.eth.sendSignedTransaction("0x" + claimTx.txhex);
      txPromise.then((res) => {
        claimTx.txhash = res.transactionHash;
        claimTx.txblock = res.blockNumber;
        resolve();
      }, (err) => {
        ServiceManager.GetService(PoWStatusLog).emitLog(PoWStatusLogLevel.ERROR, "Transaction for " + claimTx.target + " failed: " + err);
        return this.sendClaimTx(claimTx);
      });
    });
  }


}
