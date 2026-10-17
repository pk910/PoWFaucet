import { faucetConfig } from '../../config/FaucetConfig.js';
import { IClaimTxConfig } from '../../config/ConfigSchema.js';
import { Erc20Abi } from '../../abi/ERC20.js';
import { ContractCaller, EthLog, IEthRpcClient } from '../rpc/index.js';
import { resolveCallArg, resolveCallArgs } from '../CallArgs.js';
import { EthClaimInfo } from '../EthClaimManager.js';

/** What one transaction pays out and how: the input to signing. */
export interface ClaimTxPlan {
  to: string;
  value: bigint;
  data: string;
  gasLimit: number;
  claims: EthClaimInfo[];
}

/** Per-claim outcome read from a mined batch: which recipients the contract reported as failed. */
export interface ClaimTxOutcome {
  failedTargets: Set<string>;
}

/**
 * Turns queued claims into a transaction plan.
 *
 * Without `ethClaimTx` the plan is the one the faucet always sent: a native transfer or an ERC20
 * `transfer`, one claim per transaction. With a template the plan is a call on the configured
 * contract, and with `batch` several claims share one call.
 */
export class ClaimTxBuilder {
  private client: IEthRpcClient;
  private walletAddr: string;
  private token: string | null;
  private config: IClaimTxConfig | null;
  private contract: ContractCaller | null = null;

  public constructor(client: IEthRpcClient, walletAddr: string, token: string | null, config?: IClaimTxConfig | null) {
    this.client = client;
    this.walletAddr = walletAddr;
    this.token = token;
    this.config = config === undefined ? faucetConfig.ethClaimTx : config;
    if(this.config) {
      let batchFn = this.config.batch?.fn;
      if(!this.config.contract || !this.config.abi || (!this.config.fn && !batchFn))
        throw new Error("ethClaimTx needs contract, abi and fn (or batch.fn)");
      this.contract = new ContractCaller(this.client, this.config.contract, this.config.abi);
      if(this.config.fn && !this.contract.hasFunction(this.config.fn))
        throw new Error("ethClaimTx.fn '" + this.config.fn + "' is not in the abi");
      if(batchFn && !this.contract.hasFunction(batchFn))
        throw new Error("ethClaimTx.batch.fn '" + batchFn + "' is not in the abi");
    }
  }

  /** How many claims one transaction may carry. */
  public getBatchSize(): number {
    let batch = this.config?.batch;
    if(!batch || !(batch.maxClaims > 1))
      return 1;
    return Math.floor(batch.maxClaims);
  }

  /** Seconds a partial batch waits for more claims before it is sent anyway. */
  public getBatchMaxWait(): number {
    let batch = this.config?.batch;
    if(!batch || this.getBatchSize() <= 1)
      return 0;
    return Math.max(0, batch.maxWaitSeconds || 0);
  }

  public async buildPlan(claims: EthClaimInfo[]): Promise<ClaimTxPlan> {
    if(claims.length === 0)
      throw new Error("no claims to build a transaction for");
    if(!this.config) {
      if(claims.length > 1)
        throw new Error("batching needs an ethClaimTx template with a batch block");
      return this.buildLegacyPlan(claims[0]);
    }

    // several claims always go through the batch function; one claim goes through `fn`, or through
    // the batch function with one-element lists when the template has no single-claim function
    let batch = this.config.batch;
    let useBatch = claims.length > 1 || !this.config.fn;
    if(useBatch && !batch?.fn)
      throw new Error("ethClaimTx has no batch function, cannot pay " + claims.length + " claims in one transaction");
    if(claims.length > 1 && claims.length > this.getBatchSize())
      throw new Error("ethClaimTx.batch.maxClaims is " + this.getBatchSize() + ", got " + claims.length + " claims");

    let ctx = { walletAddr: this.walletAddr, token: this.token, claims: claims };
    let fn = useBatch ? batch.fn : this.config.fn;
    let args = resolveCallArgs(useBatch ? (batch.args || []) : (this.config.args || []), ctx);
    let valueSetting = useBatch ? batch.value : this.config.value;
    let value = valueSetting ? BigInt(resolveCallArg(valueSetting, ctx) as string) : 0n;
    let data = this.contract.encode(fn, args);
    let gasLimit = await this.resolveGasLimit(
      useBatch ? batch.gasLimit : this.config.gasLimit,
      useBatch ? batch.gasLimitPerClaim : undefined,
      claims.length,
      { to: this.config.contract, value, data },
    );
    return { to: this.config.contract, value, data, gasLimit, claims };
  }

  private async buildLegacyPlan(claim: EthClaimInfo): Promise<ClaimTxPlan> {
    let amount = BigInt(claim.amount);
    if(this.token) {
      let tokenContract = new ContractCaller(this.client, this.token, Erc20Abi);
      return {
        to: this.token,
        value: 0n,
        data: tokenContract.encode("transfer", [claim.target, amount]),
        gasLimit: faucetConfig.ethTxGasLimit,
        claims: [claim],
      };
    }
    return { to: claim.target, value: amount, data: "0x", gasLimit: faucetConfig.ethTxGasLimit, claims: [claim] };
  }

  /**
   * A number is used as is (plus `perClaim` per claim for batches); "estimate" asks the node and
   * adds 20 %, falling back to the configured limit when the estimate fails; nothing means
   * ethTxGasLimit.
   */
  private async resolveGasLimit(setting: number | "estimate" | undefined, perClaim: number | undefined, claimCount: number, tx: { to: string; value: bigint; data: string }): Promise<number> {
    let fallback = faucetConfig.ethTxGasLimit;
    if(typeof setting === "number" && setting > 0)
      return setting + (perClaim && perClaim > 0 ? perClaim * claimCount : 0);
    if(setting === "estimate") {
      try {
        let estimate = await this.client.estimateGas({ from: this.walletAddr, to: tx.to, data: tx.data, value: tx.value });
        return Number(estimate + estimate / 5n);
      } catch(ex) {
        return fallback + (perClaim && perClaim > 0 ? perClaim * claimCount : 0);
      }
    }
    return fallback + (perClaim && perClaim > 0 ? perClaim * claimCount : 0);
  }

  /**
   * Which claims of a mined batch the contract reported as failed, read from the receipt logs.
   * Needs `batch.failedEvent` (an event in the abi with an address argument naming the recipient,
   * `batch.failedEventArg`, default "to"); without it a mined batch pays everyone or no one.
   */
  public evaluateReceipt(logs: EthLog[]): ClaimTxOutcome {
    let failedTargets = new Set<string>();
    let batch = this.config?.batch;
    if(!this.contract || !batch || !batch.failedEvent)
      return { failedTargets };
    let recipientArg = batch.failedEventArg || "to";
    let contractAddr = this.config.contract.toLowerCase();
    for(let event of this.contract.decodeLogs(logs.filter((log) => log.address?.toLowerCase() === contractAddr))) {
      if(event.eventName !== batch.failedEvent)
        continue;
      let recipient = event.args[recipientArg];
      if(typeof recipient === "string")
        failedTargets.add(recipient.toLowerCase());
    }
    return { failedTargets };
  }
}
