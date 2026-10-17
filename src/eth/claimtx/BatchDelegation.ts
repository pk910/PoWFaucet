import { ServiceManager } from '../../common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../../common/FaucetProcess.js';
import { getCreate2Address, Hex } from '../rpc/index.js';
import { EthWalletManager } from '../EthWalletManager.js';
import { BATCHER_BYTECODE } from './BatcherArtifact.js';

/** Arachnid's deterministic deployment proxy: the same address on every chain, deploys `salt ++ initcode` with CREATE2. */
export const DETERMINISTIC_DEPLOYER = "0x4e59b44847b379578588920cA78FbF26c0B4956C";

/** the batcher's CREATE2 salt: one batcher per bytecode, shared by every faucet on a chain */
export const BATCHER_SALT = ("0x" + "00".repeat(32)) as Hex;

/** Where the batcher lives on any chain with the deterministic deployer: a function of its bytecode alone. */
export function getBatcherAddress(): string {
  return getCreate2Address({ from: DETERMINISTIC_DEPLOYER as Hex, salt: BATCHER_SALT, bytecode: BATCHER_BYTECODE as Hex });
}

/** The code an EIP-7702 delegated account shows: 0xef0100 followed by the delegate's address. */
export function delegationCode(delegate: string): string {
  return ("0xef0100" + delegate.substring(2)).toLowerCase();
}

const RETRY_INTERVAL = 300; // seconds between setup attempts after a failure
const DEPLOY_GAS_LIMIT = 1000000;
const DELEGATE_GAS_LIMIT = 100000;

/**
 * Makes the faucet wallet able to batch: the batcher contract exists on the chain, and the wallet's
 * code is delegated to it (EIP-7702), so `execute` can be called on the wallet itself. Both steps
 * are transactions from the faucet wallet, sent at most once; afterwards only the code checks run.
 * A failure (no deployer on the chain, no EIP-7702 yet, a rejected transaction) disables batching
 * until the next attempt; single-claim transactions are unaffected.
 */
export class BatchDelegation {
  private walletManager: EthWalletManager;
  private ready: boolean = false;
  private lastAttempt: number = 0;
  private pending: Promise<boolean> | null = null;

  public constructor(walletManager: EthWalletManager) {
    this.walletManager = walletManager;
  }

  public isReady(): boolean {
    return this.ready;
  }

  /** True once the wallet runs the batcher's code; false while that is not the case (and not retried for a while). */
  public ensureReady(): Promise<boolean> {
    if(this.ready)
      return Promise.resolve(true);
    if(this.pending)
      return this.pending;
    let now = Math.floor(Date.now() / 1000);
    if(now - this.lastAttempt < RETRY_INTERVAL)
      return Promise.resolve(false);
    this.lastAttempt = now;
    this.pending = this.setup().then(() => {
      this.ready = true;
      return true;
    }, (err) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, "Claim batching unavailable, paying one claim per transaction: " + (err?.message || err));
      return false;
    }).finally(() => {
      this.pending = null;
    });
    return this.pending;
  }

  private async setup(): Promise<void> {
    let client = this.walletManager.getClient();
    let wallet = this.walletManager.getFaucetAddress();
    let batcher = getBatcherAddress();
    let log = (msg: string) => ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, msg);

    // 1. the batcher contract, deployed once per chain through the deterministic deployer
    if(await client.getCode(batcher) === "0x") {
      if(await client.getCode(DETERMINISTIC_DEPLOYER) === "0x")
        throw new Error("the deterministic deployment proxy " + DETERMINISTIC_DEPLOYER + " is not deployed on this chain");
      log("Deploying claim batcher to " + batcher + " via the deterministic deployment proxy");
      let deployTx = await this.walletManager.sendCustomTx(DETERMINISTIC_DEPLOYER, 0n, BATCHER_SALT + BATCHER_BYTECODE.substring(2), DEPLOY_GAS_LIMIT);
      let deployed = await deployTx.txPromise;
      if(!deployed.status)
        throw new Error("batcher deployment transaction " + deployTx.txHash + " reverted");
      if(await client.getCode(batcher) === "0x")
        throw new Error("batcher deployment transaction " + deployTx.txHash + " mined but no code at " + batcher);
      log("Claim batcher deployed: " + deployTx.txHash);
    }

    // 2. the wallet's code: a delegation to the batcher
    let expected = delegationCode(batcher);
    let walletCode = (await client.getCode(wallet)).toLowerCase();
    if(walletCode !== expected) {
      if(walletCode !== "0x" && !walletCode.startsWith("0xef0100"))
        throw new Error("the faucet wallet " + wallet + " has contract code, cannot delegate it");
      log("Delegating faucet wallet " + wallet + " to the claim batcher " + batcher + " (EIP-7702)");
      let delegateTx = await this.walletManager.sendSetCodeTx(batcher, DELEGATE_GAS_LIMIT);
      let delegated = await delegateTx.txPromise;
      if(!delegated.status)
        throw new Error("delegation transaction " + delegateTx.txHash + " reverted");
      walletCode = (await client.getCode(wallet)).toLowerCase();
      if(walletCode !== expected)
        throw new Error("delegation transaction " + delegateTx.txHash + " mined but the wallet code is " + walletCode + " (does the chain support EIP-7702?)");
      log("Faucet wallet delegated to the claim batcher: " + delegateTx.txHash);
    }
    log("Claim batching active (batcher " + batcher + ")");
  }
}
