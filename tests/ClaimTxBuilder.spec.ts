import 'mocha';
import { expect } from 'chai';
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, parseAbi } from 'viem';
import { loadDefaultTestConfig } from './common.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { IClaimBatchConfig, IClaimCall, IClaimTxConfig } from '../src/config/ConfigSchema.js';
import { ClaimTxBuilder } from '../src/eth/claimtx/ClaimTxBuilder.js';
import { BATCHER_ABI } from '../src/eth/claimtx/BatcherArtifact.js';
import { ClaimTxStatus, EthClaimInfo } from '../src/eth/EthClaimManager.js';
import { EthLog, IEthRpcClient } from '../src/eth/rpc/index.js';

describe("Claim transaction builder", () => {
  const WALLET = "0x00000000000000000000000000000000000000aa";
  const TOKEN = "0x00000000000000000000000000000000000000bb";
  const CONTRACT = "0x00000000000000000000000000000000000000cc";
  const CLAIM_ABI = ["function claim(address to, uint256 ethAmount, uint256 tokenAmount) payable"];

  let estimateCalls: any[];
  let estimateResult: bigint | Error;
  const fakeClient = {
    estimateGas: async (tx: any) => {
      estimateCalls.push(tx);
      if(estimateResult instanceof Error)
        throw estimateResult;
      return estimateResult;
    },
  } as unknown as IEthRpcClient;

  beforeEach(() => {
    loadDefaultTestConfig();
    faucetConfig.ethTxGasLimit = 250000;
    estimateCalls = [];
    estimateResult = 100000n;
  });

  function claim(session: string, target: string, amount: string, data?: {[key: string]: any}): EthClaimInfo {
    return {
      session, target, amount, data,
      claim: { claimIdx: 1, claimStatus: ClaimTxStatus.QUEUE, claimTime: 0 },
    };
  }
  const c1 = claim("s1", "0x0000000000000000000000000000000000001001", "100", { tokenAmount: "5" });
  const c2 = claim("s2", "0x0000000000000000000000000000000000001002", "250", { tokenAmount: "7" });
  const c3 = claim("s3", "0x0000000000000000000000000000000000001003", "400", { tokenAmount: "9" });

  const templateCall: IClaimCall = { type: "call", to: CONTRACT, abi: CLAIM_ABI, fn: "claim", args: ["{target}", "{amount}", "{session.tokenAmount}"], value: "{amount}" };
  const template: IClaimTxConfig = { calls: [templateCall] };
  const twoCalls: IClaimTxConfig = { calls: [
    { type: "transfer", to: "{target}", amount: "{amount}" },
    { type: "token", token: TOKEN, to: "{target}", amount: "{session.tokenAmount}" },
  ] };
  const batch: IClaimBatchConfig = { maxClaims: 3, maxWaitSeconds: 10, gasLimit: 60000, gasLimitPerClaim: 45000 };

  /** the stream `execute` was called with */
  function executeStream(data: string): string {
    let call = decodeFunctionData({ abi: BATCHER_ABI, data: data as `0x${string}` });
    expect(call.functionName).to.equal("execute");
    return call.args[0] as string;
  }

  describe("one claim per transaction", () => {
    it("plans a native transfer", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, null, null);
      expect(builder.getBatchSize()).to.equal(1);
      let plan = await builder.buildPlan([c1]);
      expect(plan).to.deep.equal({ to: c1.target, value: 100n, nativeSpend: 100n, data: "0x", gasLimit: 250000, claims: [c1] });
    });

    it("plans an erc20 transfer", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, TOKEN, null, null);
      let plan = await builder.buildPlan([c1]);
      expect(plan.to).to.equal(TOKEN);
      expect(plan.value).to.equal(0n);
      expect(plan.nativeSpend).to.equal(0n);
      expect(plan.gasLimit).to.equal(250000);
      let call = decodeFunctionData({ abi: parseAbi(["function transfer(address to, uint256 value)"]), data: plan.data as `0x${string}` });
      expect(call.functionName).to.equal("transfer");
      expect((call.args[0] as string).toLowerCase()).to.equal(c1.target);
      expect(call.args[1]).to.equal(100n);
    });

    it("plans the template's contract call with session data and native value", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, template, null);
      let plan = await builder.buildPlan([c1]);
      expect(plan.to).to.equal(CONTRACT);
      expect(plan.value).to.equal(100n);
      expect(plan.nativeSpend).to.equal(100n);
      expect(plan.gasLimit).to.equal(250000, "default gas limit is ethTxGasLimit");
      let call = decodeFunctionData({ abi: parseAbi(CLAIM_ABI), data: plan.data as `0x${string}` });
      expect(call.functionName).to.equal("claim");
      expect((call.args[0] as string).toLowerCase()).to.equal(c1.target);
      expect(call.args[1]).to.equal(100n);
      expect(call.args[2]).to.equal(5n);
    });

    it("validates the calls against their abi", () => {
      expect(() => new ClaimTxBuilder(fakeClient, WALLET, null, { calls: [] }, null)).to.throw(/at least one call/);
      expect(() => new ClaimTxBuilder(fakeClient, WALLET, null, { calls: [{ ...templateCall, fn: "nope" }] }, null)).to.throw(/'nope' is not in its abi/);
    });

    it("refuses a claim of several calls without batching", async () => {
      let err: any;
      try { await new ClaimTxBuilder(fakeClient, WALLET, null, twoCalls, null).buildPlan([c1]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/a claim of 2 calls needs ethClaimBatch/);
    });

    it("fails a claim whose session lacks a referenced key", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, template, null);
      let err: any;
      try { await builder.buildPlan([claim("s9", c1.target, "1", {})]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/s9 has no session data 'tokenAmount'/);
    });

    it("asks the node for gas when configured, with a 20 % margin and a fallback", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, { ...template, gasLimit: "estimate" }, null);
      let plan = await builder.buildPlan([c1]);
      expect(plan.gasLimit).to.equal(120000);
      expect(estimateCalls[0]).to.deep.equal({ from: WALLET, to: CONTRACT, data: plan.data, value: 100n });
      estimateResult = new Error("execution reverted");
      plan = await builder.buildPlan([c1]);
      expect(plan.gasLimit).to.equal(250000, "fallback to ethTxGasLimit");
    });

    it("refuses several claims without active batching", async () => {
      let err: any;
      try { await new ClaimTxBuilder(fakeClient, WALLET, null, null, null).buildPlan([c1, c2]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/batching is not active/);
      // configured but the delegation is not in place yet
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, null, batch);
      expect(builder.isBatchConfigured()).to.equal(true);
      expect(builder.getBatchSize()).to.equal(1);
      err = null;
      try { await builder.buildPlan([c1, c2]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/batching is not active/);
    });
  });

  describe("batched through the wallet's own code", () => {
    function activeBuilder(token: string | null, config: IClaimTxConfig | null, batchConfig: IClaimBatchConfig = batch): ClaimTxBuilder {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, token, config, batchConfig);
      builder.setBatchActive(true);
      return builder;
    }

    it("calls execute on the wallet with a transfer per claim and nothing riding on the transaction", async () => {
      let builder = activeBuilder(null, null);
      expect(builder.getBatchSize()).to.equal(3);
      expect(builder.getBatchMaxWait()).to.equal(10);
      let plan = await builder.buildPlan([c1, c2, c3]);
      expect(plan.to).to.equal(WALLET, "the wallet executes its own code");
      expect(plan.value).to.equal(0n, "the sub-calls pay from the wallet balance");
      expect(plan.nativeSpend).to.equal(750n, "what leaves the wallet in total");
      expect(plan.gasLimit).to.equal(60000 + 3 * 45000);
      expect(executeStream(plan.data)).to.equal(
        "0x" +
        "00" + c1.target.substring(2) + "000000000000000000000064" +
        "00" + c2.target.substring(2) + "0000000000000000000000fa" +
        "00" + c3.target.substring(2) + "000000000000000000000190"
      );
    });

    it("pays an erc20 faucet's claims with the wallet's own token transfers", async () => {
      let plan = await activeBuilder(TOKEN, null).buildPlan([c1]);
      expect(plan.to).to.equal(WALLET);
      expect(plan.nativeSpend).to.equal(0n);
      expect(executeStream(plan.data)).to.equal("0x" + "01" + TOKEN.substring(2) + c1.target.substring(2) + "000000000000000000000064");
    });

    it("streams the configured contract call per claim", async () => {
      let plan = await activeBuilder(null, template).buildPlan([c1, c2]);
      expect(plan.nativeSpend).to.equal(350n, "the call's value per claim, paid from the wallet");
      let stream = executeStream(plan.data);
      // 0x02 to(20) value(12) len(2) data(4 + 3*32 = 100 bytes) per claim
      expect(stream.length).to.equal(2 + 2 * (35 + 100) * 2);
      expect(stream.substring(2, 4)).to.equal("02");
      expect(stream.substring(4, 44)).to.equal(CONTRACT.substring(2));
      let data = "0x" + stream.substring(2 + 35 * 2, 2 + 35 * 2 + 200);
      let call = decodeFunctionData({ abi: parseAbi(CLAIM_ABI), data: data as `0x${string}` });
      expect(call.functionName).to.equal("claim");
      expect(call.args[1]).to.equal(100n);
      expect(call.args[2]).to.equal(5n);
    });

    it("streams several calls per claim", async () => {
      let builder = activeBuilder(null, twoCalls);
      let plan = await builder.buildPlan([c1, c2]);
      expect(plan.nativeSpend).to.equal(350n, "only native coin counts");
      expect(executeStream(plan.data).length).to.equal(2 + 2 * (33 + 53) * 2);
    });

    it("refuses more claims than maxClaims", async () => {
      let err: any;
      try { await activeBuilder(null, null).buildPlan([c1, c2, c3, c1]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/maxClaims is 3, got 4/);
    });

    function failedLog(address: string, index: number): EthLog {
      return {
        address,
        topics: encodeEventTopics({ abi: BATCHER_ABI, eventName: "CallFailed", args: { index: BigInt(index) } }) as string[],
        data: encodeAbiParameters([{ type: "uint8" }, { type: "address" }, { type: "uint256" }], [0, c2.target as `0x${string}`, 250n]),
        logIndex: 0,
      };
    }

    it("records each claim's sub-call range on the plan", async () => {
      let plan = await activeBuilder(null, twoCalls).buildPlan([c1, c2, c3]);
      expect(plan.callRanges).to.deep.equal([{ offset: 0, count: 2 }, { offset: 2, count: 2 }, { offset: 4, count: 2 }]);
      let single = await new ClaimTxBuilder(fakeClient, WALLET, null, null, null).buildPlan([c1]);
      expect(single.callRanges).to.equal(undefined, "a plain transaction has no stream");
    });

    it("reads failed sub-call positions from the wallet's logs, nothing else", () => {
      let failed = ClaimTxBuilder.failedCallIndexes(WALLET, [
        failedLog(WALLET, 1),
        failedLog(CONTRACT, 2), // some other contract's event
        { address: WALLET, topics: ["0x" + "12".repeat(32)], data: "0x", logIndex: 2 }, // unknown event
        failedLog(WALLET, 3),
      ]);
      expect(Array.from(failed).sort()).to.deep.equal([1, 3]);
    });
  });
});
