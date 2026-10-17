import 'mocha';
import { expect } from 'chai';
import { decodeFunctionData, parseAbi } from 'viem';
import { encodeBatchCalls, resolveClaimCall } from '../src/eth/claimtx/BatchCalls.js';
import { ClaimTxStatus, EthClaimInfo } from '../src/eth/EthClaimManager.js';

describe("Claim calls and the batch stream", () => {
  const WALLET = "0x00000000000000000000000000000000000000aa";
  const TOKEN = "0x00000000000000000000000000000000000000bb";
  const CONTRACT = "0x00000000000000000000000000000000000000cc";

  function claim(session: string, target: string, amount: string, data?: {[key: string]: any}): EthClaimInfo {
    return {
      session, target, amount, data,
      claim: { claimIdx: 1, claimStatus: ClaimTxStatus.QUEUE, claimTime: 0 },
    };
  }
  const c1 = claim("s1", "0x0000000000000000000000000000000000001001", "100", { tokenAmount: "5" });
  const c2 = claim("s2", "0x0000000000000000000000000000000000001002", "256", { tokenAmount: "7" });

  it("packs a transfer per claim into 33 bytes each and sums the value", () => {
    let stream = encodeBatchCalls([{ type: "transfer", to: "{target}", amount: "{amount}" }], [c1, c2], { walletAddr: WALLET, token: null });
    expect(stream.calls).to.equal(
      "0x" +
      "00" + "0000000000000000000000000000000000001001" + "000000000000000000000064" +
      "00" + "0000000000000000000000000000000000001002" + "000000000000000000000100"
    );
    expect(stream.value).to.equal(356n);
    expect(stream.callsPerClaim).to.equal(1);
  });

  it("packs token transfers and arbitrary calls, in claim order", () => {
    let stream = encodeBatchCalls([
      { type: "transfer", to: "{target}", amount: "{amount}" },
      { type: "token", token: "{token}", to: "{target}", amount: "{session.tokenAmount}" },
      { type: "call", to: CONTRACT, value: "0", data: "0xdeadbeef" },
    ], [c1], { walletAddr: WALLET, token: TOKEN });
    expect(stream.calls).to.equal(
      "0x" +
      "00" + "0000000000000000000000000000000000001001" + "000000000000000000000064" +
      "01" + "00000000000000000000000000000000000000bb" + "0000000000000000000000000000000000001001" + "000000000000000000000005" +
      "02" + "00000000000000000000000000000000000000cc" + "000000000000000000000000" + "0004" + "deadbeef"
    );
    expect(stream.value).to.equal(100n, "only native coin counts");
    expect(stream.callsPerClaim).to.equal(3);
  });

  it("builds a call's data from an abi, a function and placeholder arguments", () => {
    let abi = ["function claim(address to, uint256 ethAmount, uint256 tokenAmount) payable"];
    let call = resolveClaimCall({ type: "call", to: CONTRACT, abi, fn: "claim", args: ["{target}", "{amount}", "{session.tokenAmount}"], value: "{amount}" }, { walletAddr: WALLET, token: null, claims: [c1] });
    expect(call.to).to.equal(CONTRACT);
    expect(call.amount).to.equal(100n, "value");
    let decoded = decodeFunctionData({ abi: parseAbi(abi), data: ("0x" + call.data) as `0x${string}` });
    expect(decoded.functionName).to.equal("claim");
    expect((decoded.args[0] as string).toLowerCase()).to.equal(c1.target);
    expect(decoded.args[1]).to.equal(100n);
    expect(decoded.args[2]).to.equal(5n);
  });

  it("rejects bad fields", () => {
    let ctx = { walletAddr: WALLET, token: null };
    expect(() => encodeBatchCalls([], [c1], ctx)).to.throw(/empty/);
    expect(() => encodeBatchCalls([{ type: "transfer", to: "nope", amount: "1" }], [c1], ctx)).to.throw(/not an address/);
    expect(() => encodeBatchCalls([{ type: "transfer", to: "{target}", amount: (1n << 96n).toString() }], [c1], ctx)).to.throw(/out of range/);
    expect(() => encodeBatchCalls([{ type: "transfer", to: "{target}", amount: "abc" }], [c1], ctx)).to.throw(/not a number/);
    expect(() => encodeBatchCalls([{ type: "call", to: CONTRACT, data: "0xabc" }], [c1], ctx)).to.throw(/not hex/);
    expect(() => encodeBatchCalls([{ type: "token", token: "{token}", to: "{target}", amount: "1" }], [c1], ctx)).to.throw(/native coin/);
    expect(() => encodeBatchCalls([{ type: "burn" as any, to: "{target}" }], [c1], ctx)).to.throw(/unknown claim call type/);
  });

  it("refuses calls into the wallet itself", () => {
    let ctx = { walletAddr: WALLET, token: TOKEN };
    expect(() => encodeBatchCalls([{ type: "call", to: "{walletAddr}", data: "0x" }], [c1], ctx)).to.throw(/is the faucet wallet itself/);
    expect(() => encodeBatchCalls([{ type: "token", token: WALLET, to: "{target}", amount: "1" }], [c1], ctx)).to.throw(/is the faucet wallet itself/);
    // a transfer to the wallet is pointless but harmless
    expect(encodeBatchCalls([{ type: "transfer", to: "{walletAddr}", amount: "1" }], [c1], ctx).callsPerClaim).to.equal(1);
  });
});
