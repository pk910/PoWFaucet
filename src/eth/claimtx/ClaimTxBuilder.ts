import { faucetConfig } from '../../config/FaucetConfig.js';
import { IClaimBatchConfig, IClaimCall, IClaimTxConfig } from '../../config/ConfigSchema.js';
import { Erc20Abi } from '../../abi/ERC20.js';
import { ContractCaller, EthLog, IEthRpcClient, getAbiItem } from '../rpc/index.js';
import { EthClaimInfo } from '../EthClaimManager.js';
import { BATCHER_TRANSFER_GAS, DEFAULT_CALL_GAS, ResolvedClaimCall, encodeBatchCalls, resolveClaimCall } from './BatchCalls.js';
import { BATCHER_ABI } from './BatcherArtifact.js';

/** What one transaction pays out and how: the input to signing. */
export interface ClaimTxPlan {
  to: string;
  /** native coin sent with the transaction */
  value: bigint;
  /** native coin leaving the wallet in total: `value`, plus what a batch moves from the wallet balance inside `execute` */
  nativeSpend: bigint;
  /** units of the faucet's own token leaving the wallet (erc20 faucets); other tokens a template moves are not counted here */
  tokenSpend?: bigint;
  data: string;
  gasLimit: number;
  claims: EthClaimInfo[];
  /** batch plans: each claim's sub-call range in the stream, in claim order */
  callRanges?: { offset: number; count: number }[];
}

/** A batch whose gas limit times ethTxMaxFee is above ethTxFeeCap; `fit` claims of it would be under it. Nothing was signed. */
export class BatchTooExpensiveError extends Error {
  public readonly claims: number;
  public readonly gasLimit: number;
  public readonly fit: number;

  public constructor(claims: number, gasLimit: number, fit: number) {
    super("a batch of " + claims + " claims needs " + gasLimit + " gas, more than ethTxFeeCap allows at ethTxMaxFee; " + fit + " claims fit");
    this.name = "BatchTooExpensiveError";
    this.claims = claims;
    this.gasLimit = gasLimit;
    this.fit = fit;
  }
}

/**
 * Turns queued claims into a transaction plan.
 *
 * `ethClaimTx` says what a claim is: one or more calls (default: the faucet coin's plain transfer).
 * One claim with one call is a plain transaction. With `ethClaimBatch` active (the wallet runs the
 * batcher's code, EIP-7702) claims become one `execute` call on the wallet itself carrying every
 * claim's calls as a packed stream; that is also how a claim with several calls is paid.
 */
export class ClaimTxBuilder {
  private client: IEthRpcClient;
  private walletAddr: string;
  private token: string | null;
  private config: IClaimTxConfig | null;
  private batchConfig: IClaimBatchConfig | null;
  private batchActive: boolean = false;
  private batcher: ContractCaller;

  public constructor(client: IEthRpcClient, walletAddr: string, token: string | null, config?: IClaimTxConfig | null, batchConfig?: IClaimBatchConfig | null) {
    this.client = client;
    this.walletAddr = walletAddr;
    this.token = token;
    this.config = config === undefined ? faucetConfig.ethClaimTx : config;
    this.batchConfig = batchConfig === undefined ? faucetConfig.ethClaimBatch : batchConfig;
    if(this.config) {
      if(!Array.isArray(this.config.calls) || this.config.calls.length === 0)
        throw new Error("ethClaimTx.calls must list at least one call");
      for(let call of this.config.calls)
        ClaimTxBuilder.checkTemplateCall(call, this.token);
    }
    this.batcher = new ContractCaller(this.client, this.walletAddr, BATCHER_ABI);
  }

  /**
   * What a template may leave to the claim and what it may not. The recipient of a transfer and
   * the amounts are the claim's business, and `{session.<key>}` values are a module's. But the
   * contract the wallet calls, the token it moves and raw calldata are the operator's and fixed at
   * startup: a target taken from the claim would let a claimant pick the code the faucet wallet
   * runs, and placeholders in raw calldata would let a session write the wallet's calls. The
   * faucet's own token is moved with `token` calls only, where its spend is counted: a `call` to
   * the token contract (a transfer, an approval) would move it past the bound.
   */
  private static checkTemplateCall(call: IClaimCall, faucetToken: string | null): void {
    let fixedAddress = (value: unknown, what: string, alsoAllowed: string[] = []) => {
      if(typeof value === "string" && (/^0[xX][0-9a-fA-F]{40}$/.test(value) || alsoAllowed.indexOf(value) !== -1))
        return;
      throw new Error("ethClaimTx " + call.type + " " + what + " must be a fixed address" + (alsoAllowed.length ? " or " + alsoAllowed.join("/") : "") + ", not " + String(value));
    };
    switch(call.type) {
      case "transfer":
        break;
      case "token":
        fixedAddress(call.token, "token", ["{token}"]);
        break;
      case "call":
        fixedAddress(call.to, "to");
        if(faucetToken && String(call.to).toLowerCase() === faucetToken.toLowerCase())
          throw new Error("ethClaimTx call to must not be the faucet token contract (use a token call, whose amount is bounded by the claim)");
        if(call.data !== undefined && !/^0[xX]([0-9a-fA-F]{2})*$/.test(String(call.data)))
          throw new Error("ethClaimTx call data must be fixed hex, not " + String(call.data) + " (use abi, fn and args for values from the claim)");
        if(call.abi && call.fn) {
          let caller = new ContractCaller(null, "0x0000000000000000000000000000000000000000", call.abi);
          if(!caller.hasFunction(call.fn))
            throw new Error("ethClaimTx call fn '" + call.fn + "' is not in its abi");
          // a session's values go into numbers only: an address or bytes argument from the session
          // would let it choose where a router sends the wallet's call, and what it says there
          let inputs = (getAbiItem({ abi: caller.abi, name: call.fn }) as any)?.inputs || [];
          (call.args || []).forEach((arg, idx) => {
            if(typeof arg === "string" && /\{session\./.test(arg) && !/^(u?int\d*|bool)(\[\])?$/.test(inputs[idx]?.type || ""))
              throw new Error("ethClaimTx call arg " + idx + " of " + call.fn + " takes " + arg + " for a " + (inputs[idx]?.type || "?") + " parameter: session values may only fill numbers (uint, int, bool)");
          });
        }
        break;
    }
  }

  /** The calls one claim consists of. */
  public getClaimCalls(): IClaimCall[] {
    if(this.config)
      return this.config.calls;
    if(this.token)
      return [{ type: "token", token: this.token, to: "{target}", amount: "{amount}" }];
    return [{ type: "transfer", to: "{target}", amount: "{amount}" }];
  }

  /** Batching is configured with more than one claim per transaction (it still needs the delegation to be active). */
  public isBatchConfigured(): boolean {
    return !!this.batchConfig && this.batchConfig.maxClaims > 1;
  }

  /** Whether the wallet runs the batcher's code; set by the wallet manager after the EIP-7702 setup. */
  public setBatchActive(active: boolean): void {
    this.batchActive = active;
  }

  /** The wallet is delegated: it is a contract account to the network, with the pool rules that come with that. */
  public isBatchActive(): boolean {
    return this.batchActive;
  }

  /** How many claims one transaction may carry right now: `maxClaims`, or fewer when ethTxFeeCap says so. */
  public getBatchSize(): number {
    if(!this.batchActive || !this.isBatchConfigured())
      return 1;
    return Math.max(1, Math.min(Math.floor(this.batchConfig.maxClaims), this.feeCapBatchSize()));
  }

  /**
   * How many claims fit under ethTxFeeCap. A node checks gas limit times max fee against its own
   * cap and refuses the transaction above it (geth: 1 ETH by default); a batch's gas limit is at
   * least its worst case, so that is what has to fit. The template's call data is estimated here
   * (ABI-encoded static arguments); the exact worst case is computed when the batch is built.
   */
  public feeCapBatchSize(): number {
    if(!(faucetConfig.ethTxFeeCap > 0) || !(faucetConfig.ethTxMaxFee > 0))
      return Infinity;
    let affordableGas = Math.floor(faucetConfig.ethTxFeeCap / faucetConfig.ethTxMaxFee);
    let bytes = 0;
    let calls: ResolvedClaimCall[] = [];
    for(let call of this.getClaimCalls()) {
      switch(call.type) {
        case "transfer": bytes += 33; break;
        case "token": bytes += 53; break;
        case "call": bytes += 39 + (typeof call.data === "string" ? Math.max(0, (call.data.length - 2) / 2) : 4 + 32 * (call.args?.length || 0)); break; // kind, to, value, gas, length
      }
      calls.push({ type: call.type, to: this.walletAddr, amount: 0n, gas: call.gas, data: "0x" });
    }
    // worstCaseBatchGas of n claims is linear in n: the base (and the ABI head of the stream) once, the rest per claim
    let base = ClaimTxBuilder.worstCaseBatchGas([], 4 + 64);
    let perClaim = ClaimTxBuilder.worstCaseBatchGas(calls, bytes) - ClaimTxBuilder.worstCaseBatchGas([], 0);
    return Math.floor((affordableGas - base) / perClaim);
  }

  /** Seconds a partial batch waits for more claims before it is sent anyway. */
  public getBatchMaxWait(): number {
    if(this.getBatchSize() <= 1)
      return 0;
    return Math.max(0, this.batchConfig.maxWaitSeconds || 0);
  }

  public async buildPlan(claims: EthClaimInfo[]): Promise<ClaimTxPlan> {
    if(claims.length === 0)
      throw new Error("no claims to build a transaction for");
    // with the batcher active every claim goes through it, alone or not: one code path, one kind of receipt
    if(this.batchActive && this.isBatchConfigured())
      return this.buildBatchPlan(claims);
    if(claims.length > 1)
      throw new Error("cannot pay " + claims.length + " claims in one transaction: batching is not active");
    let calls = this.getClaimCalls();
    if(calls.length > 1)
      throw new Error("a claim of " + calls.length + " calls needs ethClaimBatch (the wallet's own code executes them)");
    return this.buildSinglePlan(claims[0], calls[0]);
  }

  /** One claim, one call: a plain transaction. */
  private async buildSinglePlan(claim: EthClaimInfo, template: IClaimCall): Promise<ClaimTxPlan> {
    let call = resolveClaimCall(template, { walletAddr: this.walletAddr, token: this.token, claims: [claim] });
    let plan: ClaimTxPlan;
    switch(call.type) {
      case "transfer":
        plan = { to: call.to, value: call.amount, nativeSpend: call.amount, data: "0x", gasLimit: 0, claims: [claim] };
        break;
      case "token":
        plan = { to: call.token, value: 0n, nativeSpend: 0n, tokenSpend: this.token && call.token === this.token.toLowerCase() ? call.amount : 0n, data: new ContractCaller(this.client, call.token, Erc20Abi).encode("transfer", [call.to, call.amount]), gasLimit: 0, claims: [claim] };
        break;
      case "call":
        plan = { to: call.to, value: call.amount, nativeSpend: call.amount, data: "0x" + call.data, gasLimit: 0, claims: [claim] };
        break;
    }
    plan.gasLimit = await this.resolveGasLimit(this.config?.gasLimit, undefined, 1, plan);
    this.checkFeeCap(plan.gasLimit, [claim]);
    return plan;
  }

  /**
   * The gas a batch needs if every sub-call burns all it may: the transaction base, the calldata,
   * and per sub-call its stipend plus what the caller pays around it. For a call that carries
   * value that is a cold account (2600), the value transfer (9000) and, for a recipient the chain
   * has never seen, its creation (25000), plus the batcher's own loop and the failure event: about
   * 40k on top of the stipend. A token transfer calls a contract without value: 15k. The plan's gas
   * limit is at least this, whatever the configuration says, so no recipient can make the whole
   * batch run out of gas by using up its own.
   */
  public static worstCaseBatchGas(calls: ResolvedClaimCall[], dataBytes: number): number {
    let gas = 21000 + 16 * dataBytes + 30000; // base, calldata (worst case, no zero bytes), execute's own frame
    for(let call of calls) {
      switch(call.type) {
        case "transfer": gas += BATCHER_TRANSFER_GAS + 40000; break;
        case "token": gas += BATCHER_TRANSFER_GAS * 2 + 15000; break;
        case "call": gas += (call.gas ?? DEFAULT_CALL_GAS) + 40000; break;
      }
    }
    return gas;
  }

  /**
   * A node refuses a transaction whose gas limit times max fee is above its fee cap, so a plan
   * above ethTxFeeCap is refused here, before anything is signed. A batch of several claims says
   * how many would fit (BatchTooExpensiveError, the queue sends that many); one claim that does not
   * fit cannot be made smaller and fails.
   */
  private checkFeeCap(gasLimit: number, claims: EthClaimInfo[]): void {
    if(!(faucetConfig.ethTxFeeCap > 0) || !(faucetConfig.ethTxMaxFee > 0))
      return;
    if(BigInt(gasLimit) * BigInt(faucetConfig.ethTxMaxFee) <= BigInt(faucetConfig.ethTxFeeCap))
      return;
    if(claims.length <= 1)
      throw new Error("the transaction's gas limit " + gasLimit + " times ethTxMaxFee is above ethTxFeeCap (" + faucetConfig.ethTxFeeCap + " wei); a node would refuse it");
    let base = ClaimTxBuilder.worstCaseBatchGas([], 4 + 64);
    let perClaim = (gasLimit - base) / claims.length;
    let fit = Math.floor((Math.floor(faucetConfig.ethTxFeeCap / faucetConfig.ethTxMaxFee) - base) / perClaim);
    throw new BatchTooExpensiveError(claims.length, gasLimit, Math.max(1, Math.min(claims.length - 1, fit)));
  }

  private async buildBatchPlan(claims: EthClaimInfo[]): Promise<ClaimTxPlan> {
    if(claims.length > this.getBatchSize())
      throw new Error("ethClaimBatch.maxClaims is " + this.getBatchSize() + ", got " + claims.length + " claims");
    let stream = encodeBatchCalls(this.getClaimCalls(), claims, { walletAddr: this.walletAddr, token: this.token });
    let data = this.batcher.encode("execute", [stream.calls]);
    let gasLimit = await this.resolveGasLimit(this.batchConfig.gasLimit, this.batchConfig.gasLimitPerClaim, claims.length, { to: this.walletAddr, value: 0n, data });
    gasLimit = Math.max(gasLimit, ClaimTxBuilder.worstCaseBatchGas(stream.resolved, (data.length - 2) / 2));
    this.checkFeeCap(gasLimit, claims); // the exact check behind feeCapBatchSize's estimate
    let callRanges = claims.map((claim, idx) => ({ offset: idx * stream.callsPerClaim, count: stream.callsPerClaim }));
    // the wallet pays the calls from its own balance inside execute: nothing rides on the transaction
    return { to: this.walletAddr, value: 0n, nativeSpend: stream.value, tokenSpend: stream.tokenValue, data, gasLimit, claims, callRanges };
  }

  /**
   * A number is used as is (plus `perClaim` per claim for batches); "estimate" asks the node and
   * adds 20 %, falling back to the configured limit when the estimate fails; nothing means
   * ethTxGasLimit.
   */
  private async resolveGasLimit(setting: number | "estimate" | undefined, perClaim: number | undefined, claimCount: number, tx: { to: string; value: bigint; data: string }): Promise<number> {
    let perClaimGas = perClaim && perClaim > 0 ? perClaim * claimCount : 0;
    if(typeof setting === "number" && setting > 0)
      return setting + perClaimGas;
    if(setting === "estimate") {
      try {
        let estimate = await this.client.estimateGas({ from: this.walletAddr, to: tx.to, data: tx.data, value: tx.value });
        return Number(estimate + estimate / 5n);
      } catch(ex) {
        return faucetConfig.ethTxGasLimit + perClaimGas;
      }
    }
    return faucetConfig.ethTxGasLimit + perClaimGas;
  }

  /**
   * Whether a batch transaction ran the batcher at all: it emits `BatchExecuted` at the end. A
   * mined transaction without it did not run this code (the wallet's code was something else),
   * and paid nobody.
   */
  public static batchExecuted(walletAddr: string, logs: EthLog[]): boolean {
    let wallet = walletAddr.toLowerCase();
    let batcher = new ContractCaller(null, walletAddr, BATCHER_ABI);
    return batcher.decodeLogs(logs.filter((log) => log.address?.toLowerCase() === wallet)).some((event) => event.eventName === "BatchExecuted");
  }

  /**
   * The sub-call positions a mined batch reported as failed: the wallet (running the batcher's
   * code) emits `CallFailed(index, ...)` per sub-call it could not make. Needs nothing but the
   * wallet address and the batcher's abi, so a receipt can be read after a restart or a
   * configuration change; each claim's row says which positions are its own (`txCalls`).
   */
  public static failedCallIndexes(walletAddr: string, logs: EthLog[]): Set<number> {
    let failed = new Set<number>();
    let wallet = walletAddr.toLowerCase();
    let batcher = new ContractCaller(null, walletAddr, BATCHER_ABI);
    for(let event of batcher.decodeLogs(logs.filter((log) => log.address?.toLowerCase() === wallet))) {
      if(event.eventName !== "CallFailed")
        continue;
      let index = event.args["index"];
      if(typeof index === "bigint" || typeof index === "number")
        failed.add(Number(index));
    }
    return failed;
  }
}
