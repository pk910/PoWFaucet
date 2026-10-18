import { ServiceManager } from '../../common/ServiceManager.js';
import { FaucetLogLevel, FaucetProcess } from '../../common/FaucetProcess.js';
import { faucetConfig } from '../../config/FaucetConfig.js';
import { getCreate2Address, Hex } from '../rpc/index.js';
import { EthWalletManager } from '../EthWalletManager.js';
import { BATCHER_BYTECODE, BATCHER_RUNTIME_BYTECODE } from './BatcherArtifact.js';

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
/** an authorization for this address removes the account's delegation (EIP-7702) */
const NO_DELEGATE = "0x0000000000000000000000000000000000000000";

/**
 * The faucet wallet's EIP-7702 delegation, in the state the configuration asks for.
 *
 * With batching on: the batcher contract exists on the chain, and the wallet's code is delegated to
 * it, so `execute` can be called on the wallet itself. Both steps are transactions from the faucet
 * wallet, sent at most once; afterwards only the code checks run. A failure (no deployer on the
 * chain, no EIP-7702 yet, a rejected transaction) disables batching until the next attempt;
 * single-claim transactions are unaffected.
 *
 * With batching off: a delegation left behind by an earlier setup is cleared, because transaction
 * pools treat a delegated account differently (one in-flight transaction) and nothing uses it.
 * `ethIgnoreDelegate` leaves the wallet's code alone either way.
 */
export class BatchDelegation {
  private walletManager: EthWalletManager;
  private ready: boolean = false;
  private cleared: boolean = false;
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
    return this.attempt(() => this.setup(), () => { this.ready = true; },
      "Claim batching unavailable, paying one claim per transaction: ");
  }

  /** True once the wallet carries no delegation; false while it still does (and not retried for a while). */
  public ensureCleared(): Promise<boolean> {
    if(this.cleared)
      return Promise.resolve(true);
    return this.attempt(() => this.clear(), () => { this.cleared = true; },
      "The faucet wallet keeps its delegation: ");
  }

  /** One attempt at a time, and after a failure none for RETRY_INTERVAL. */
  private attempt(step: () => Promise<void>, done: () => void, failurePrefix: string): Promise<boolean> {
    if(this.pending)
      return this.pending;
    let now = Math.floor(Date.now() / 1000);
    if(now - this.lastAttempt < RETRY_INTERVAL)
      return Promise.resolve(false);
    this.lastAttempt = now;
    this.pending = step().then(() => {
      done();
      return true;
    }, (err) => {
      ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.ERROR, failurePrefix + (err?.message || err));
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

    // with ethIgnoreDelegate the wallet's code is whatever the operator left there: batching works
    // when that happens to be the batcher, and nothing is deployed or delegated otherwise
    let expected = delegationCode(batcher);
    if(faucetConfig.ethIgnoreDelegate) {
      let currentCode = (await client.getCode(wallet)).toLowerCase();
      if(currentCode !== expected)
        throw new Error("the faucet wallet " + wallet + " is not delegated to the claim batcher (code " + currentCode + ") and ethIgnoreDelegate leaves it so");
    }

    // 1. the batcher contract, deployed once per chain through the deterministic deployer. The wallet
    // is about to run whatever sits at that address, so it has to be exactly the compiled batcher:
    // the deployer binds the address to the initcode, but a chain may hold something else there and
    // the artifact may have been tampered with.
    let batcherCode = (await client.getCode(batcher)).toLowerCase();
    if(batcherCode === "0x") {
      if(await client.getCode(DETERMINISTIC_DEPLOYER) === "0x")
        throw new Error("the deterministic deployment proxy " + DETERMINISTIC_DEPLOYER + " is not deployed on this chain");
      log("Deploying claim batcher to " + batcher + " via the deterministic deployment proxy");
      let deployTx = await this.walletManager.sendCustomTx(DETERMINISTIC_DEPLOYER, 0n, BATCHER_SALT + BATCHER_BYTECODE.substring(2), DEPLOY_GAS_LIMIT);
      let deployed = await deployTx.txPromise;
      if(!deployed.status)
        throw new Error("batcher deployment transaction " + deployTx.txHash + " reverted");
      batcherCode = (await client.getCode(batcher)).toLowerCase();
      if(batcherCode === "0x")
        throw new Error("batcher deployment transaction " + deployTx.txHash + " mined but no code at " + batcher);
      log("Claim batcher deployed: " + deployTx.txHash);
    }
    if(batcherCode !== BATCHER_RUNTIME_BYTECODE.toLowerCase())
      throw new Error("the code at " + batcher + " is not the compiled claim batcher, refusing to delegate the wallet to it");

    // 2. the wallet's code: a delegation to the batcher
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

  /** Removes a delegation the wallet still carries: one set-code transaction with an authorization for the zero address. */
  private async clear(): Promise<void> {
    let client = this.walletManager.getClient();
    let wallet = this.walletManager.getFaucetAddress();
    let log = (msg: string) => ServiceManager.GetService(FaucetProcess).emitLog(FaucetLogLevel.INFO, msg);

    let walletCode = ((await client.getCode(wallet)) || "0x").toLowerCase();
    if(walletCode === "0x")
      return;
    if(!walletCode.startsWith("0xef0100"))
      throw new Error("the faucet wallet " + wallet + " has contract code, not a delegation");
    log("Clearing the faucet wallet's delegation to 0x" + walletCode.substring(8) + " (batching is off; ethIgnoreDelegate would keep it)");
    let clearTx = await this.walletManager.sendSetCodeTx(NO_DELEGATE, DELEGATE_GAS_LIMIT);
    let mined = await clearTx.txPromise;
    if(!mined.status)
      throw new Error("delegation clearing transaction " + clearTx.txHash + " reverted");
    walletCode = (await client.getCode(wallet)).toLowerCase();
    if(walletCode !== "0x")
      throw new Error("delegation clearing transaction " + clearTx.txHash + " mined but the wallet code is " + walletCode);
    log("Faucet wallet delegation cleared: " + clearTx.txHash);
  }
}
