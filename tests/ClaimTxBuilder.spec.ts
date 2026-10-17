import 'mocha';
import { expect } from 'chai';
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, parseAbi } from 'viem';
import { loadDefaultTestConfig } from './common.js';
import { faucetConfig } from '../src/config/FaucetConfig.js';
import { IClaimTxConfig } from '../src/config/ConfigSchema.js';
import { ClaimTxBuilder } from '../src/eth/claimtx/ClaimTxBuilder.js';
import { ClaimTxStatus, EthClaimInfo } from '../src/eth/EthClaimManager.js';
import { EthLog, IEthRpcClient } from '../src/eth/rpc/index.js';

describe("Claim transaction builder", () => {
  const WALLET = "0x00000000000000000000000000000000000000aa";
  const TOKEN = "0x00000000000000000000000000000000000000bb";
  const CONTRACT = "0x00000000000000000000000000000000000000cc";
  const DISPENSER_ABI = [
    "function claim(address to, uint256 ethAmount, uint256 tokenAmount) payable",
    "function dispense(address[] to, uint256[] amounts) payable",
    "event DispenseFailed(address indexed to, uint256 amount, address token)",
  ];

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

  describe("without a template", () => {
    it("plans a native transfer per claim", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, null);
      expect(builder.getBatchSize()).to.equal(1);
      let plan = await builder.buildPlan([c1]);
      expect(plan).to.deep.equal({ to: c1.target, value: 100n, data: "0x", gasLimit: 250000, claims: [c1] });
    });

    it("plans an erc20 transfer per claim", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, TOKEN, null);
      let plan = await builder.buildPlan([c1]);
      expect(plan.to).to.equal(TOKEN);
      expect(plan.value).to.equal(0n);
      expect(plan.gasLimit).to.equal(250000);
      let call = decodeFunctionData({ abi: parseAbi(["function transfer(address to, uint256 value)"]), data: plan.data as `0x${string}` });
      expect(call.functionName).to.equal("transfer");
      expect((call.args[0] as string).toLowerCase()).to.equal(c1.target);
      expect(call.args[1]).to.equal(100n);
    });

    it("refuses several claims", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, null);
      let err: any;
      try { await builder.buildPlan([c1, c2]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/batching needs an ethClaimTx template/);
    });
  });

  describe("with a template", () => {
    const single: IClaimTxConfig = {
      contract: CONTRACT,
      abi: DISPENSER_ABI,
      fn: "claim",
      args: ["{target}", "{amount}", "{session.tokenAmount}"],
      value: "{amount}",
    };
    const batched: IClaimTxConfig = {
      contract: CONTRACT,
      abi: DISPENSER_ABI,
      batch: {
        maxClaims: 3,
        maxWaitSeconds: 10,
        fn: "dispense",
        args: ["{targets[]}", "{amounts[]}"],
        value: "{sum}",
        gasLimit: 60000,
        gasLimitPerClaim: 45000,
        failedEvent: "DispenseFailed",
      },
    };

    it("validates the template against the abi", () => {
      expect(() => new ClaimTxBuilder(fakeClient, WALLET, null, { contract: CONTRACT, abi: DISPENSER_ABI } as IClaimTxConfig)).to.throw(/fn/);
      expect(() => new ClaimTxBuilder(fakeClient, WALLET, null, { ...single, fn: "nope" })).to.throw(/'nope' is not in the abi/);
      expect(() => new ClaimTxBuilder(fakeClient, WALLET, null, { ...batched, batch: { ...batched.batch, fn: "nope" } })).to.throw(/batch.fn 'nope'/);
    });

    it("plans a contract call per claim with session data and native value", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, single);
      expect(builder.getBatchSize()).to.equal(1);
      expect(builder.getBatchMaxWait()).to.equal(0);
      let plan = await builder.buildPlan([c1]);
      expect(plan.to).to.equal(CONTRACT);
      expect(plan.value).to.equal(100n);
      expect(plan.gasLimit).to.equal(250000, "default gas limit is ethTxGasLimit");
      let call = decodeFunctionData({ abi: parseAbi(DISPENSER_ABI), data: plan.data as `0x${string}` });
      expect(call.functionName).to.equal("claim");
      expect((call.args[0] as string).toLowerCase()).to.equal(c1.target);
      expect(call.args[1]).to.equal(100n);
      expect(call.args[2]).to.equal(5n);
    });

    it("fails a claim whose session lacks a referenced key", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, single);
      let err: any;
      try { await builder.buildPlan([claim("s9", c1.target, "1", {})]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/s9 has no session data 'tokenAmount'/);
    });

    it("asks the node for gas when configured, with a 20 % margin and a fallback", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, { ...single, gasLimit: "estimate" });
      let plan = await builder.buildPlan([c1]);
      expect(plan.gasLimit).to.equal(120000);
      expect(estimateCalls[0]).to.deep.equal({ from: WALLET, to: CONTRACT, data: plan.data, value: 100n });
      estimateResult = new Error("execution reverted");
      plan = await builder.buildPlan([c1]);
      expect(plan.gasLimit).to.equal(250000, "fallback to ethTxGasLimit");
    });

    it("plans a batch with list placeholders, sum value and per-claim gas", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, batched);
      expect(builder.getBatchSize()).to.equal(3);
      expect(builder.getBatchMaxWait()).to.equal(10);
      let plan = await builder.buildPlan([c1, c2, c3]);
      expect(plan.to).to.equal(CONTRACT);
      expect(plan.value).to.equal(750n);
      expect(plan.gasLimit).to.equal(60000 + 3 * 45000);
      let call = decodeFunctionData({ abi: parseAbi(DISPENSER_ABI), data: plan.data as `0x${string}` });
      expect(call.functionName).to.equal("dispense");
      expect((call.args[0] as string[]).map((a) => a.toLowerCase())).to.deep.equal([c1.target, c2.target, c3.target]);
      expect(call.args[1]).to.deep.equal([100n, 250n, 400n]);
    });

    it("pays a single claim through the batch function when the template has no single-claim fn", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, batched);
      let plan = await builder.buildPlan([c2]);
      let call = decodeFunctionData({ abi: parseAbi(DISPENSER_ABI), data: plan.data as `0x${string}` });
      expect(call.functionName).to.equal("dispense");
      expect(call.args[1]).to.deep.equal([250n]);
      expect(plan.value).to.equal(250n);
      expect(plan.gasLimit).to.equal(60000 + 45000);
    });

    it("prefers fn for a single claim when both are configured", async () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, { ...batched, fn: single.fn, args: single.args, value: single.value });
      let plan = await builder.buildPlan([c1]);
      expect(decodeFunctionData({ abi: parseAbi(DISPENSER_ABI), data: plan.data as `0x${string}` }).functionName).to.equal("claim");
      plan = await builder.buildPlan([c1, c2]);
      expect(decodeFunctionData({ abi: parseAbi(DISPENSER_ABI), data: plan.data as `0x${string}` }).functionName).to.equal("dispense");
    });

    it("refuses more claims than maxClaims and batches without a batch block", async () => {
      let err: any;
      try { await new ClaimTxBuilder(fakeClient, WALLET, null, batched).buildPlan([c1, c2, c3, c1]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/maxClaims is 3, got 4/);
      err = null;
      try { await new ClaimTxBuilder(fakeClient, WALLET, null, single).buildPlan([c1, c2]); } catch(ex) { err = ex; }
      expect(err?.message).to.match(/no batch function/);
    });

    function failedLog(address: string, to: string, amount: bigint): EthLog {
      let topics = encodeEventTopics({ abi: parseAbi(DISPENSER_ABI), eventName: "DispenseFailed", args: { to: to as `0x${string}` } });
      return {
        address,
        topics: topics as string[],
        data: encodeAbiParameters([{ type: "uint256" }, { type: "address" }], [amount, "0x0000000000000000000000000000000000000000"]),
        logIndex: 0,
      };
    }

    it("reads failed recipients from the receipt logs", () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, batched);
      let outcome = builder.evaluateReceipt([
        failedLog(CONTRACT, "0x0000000000000000000000000000000000001002", 250n),
        failedLog("0x00000000000000000000000000000000000000dd", "0x0000000000000000000000000000000000001003", 400n), // another contract
        { address: CONTRACT, topics: ["0x" + "12".repeat(32)], data: "0x", logIndex: 2 }, // unknown event
      ]);
      expect(Array.from(outcome.failedTargets)).to.deep.equal(["0x0000000000000000000000000000000000001002"]);
    });

    it("reports nothing failed without a failedEvent", () => {
      let builder = new ClaimTxBuilder(fakeClient, WALLET, null, { ...batched, batch: { ...batched.batch, failedEvent: undefined } });
      expect(builder.evaluateReceipt([failedLog(CONTRACT, c1.target, 100n)]).failedTargets.size).to.equal(0);
      expect(new ClaimTxBuilder(fakeClient, WALLET, null, null).evaluateReceipt([failedLog(CONTRACT, c1.target, 100n)]).failedTargets.size).to.equal(0);
    });
  });
});
