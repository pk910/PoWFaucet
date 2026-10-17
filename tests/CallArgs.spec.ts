import 'mocha';
import { expect } from 'chai';
import { keccak256 } from 'viem';
import { resolveCallArg, resolveCallArgs } from '../src/eth/CallArgs.js';
import { ClaimTxStatus, EthClaimInfo } from '../src/eth/EthClaimManager.js';

describe("Call argument placeholders", () => {
  const WALLET = "0x00000000000000000000000000000000000000aa";
  const TOKEN = "0x00000000000000000000000000000000000000bb";

  function claim(session: string, target: string, amount: string, data?: {[key: string]: any}): EthClaimInfo {
    return {
      session, target, amount, data,
      claim: { claimIdx: 1, claimStatus: ClaimTxStatus.QUEUE, claimTime: 0 },
    };
  }
  const c1 = claim("sess-1", "0x0000000000000000000000000000000000001001", "100", { tokenAmount: "5", note: "a" });
  const c2 = claim("sess-2", "0x0000000000000000000000000000000000001002", "250", { tokenAmount: "7" });

  it("passes literals and non-strings through", () => {
    let ctx = { walletAddr: WALLET, token: TOKEN, claims: [c1] };
    expect(resolveCallArg("hello", ctx)).to.equal("hello");
    expect(resolveCallArg(42, ctx)).to.equal(42);
    expect(resolveCallArg("{notAtTheEnd} x", ctx)).to.equal("{notAtTheEnd} x");
  });

  it("resolves the faucet's own addresses", () => {
    let ctx = { walletAddr: WALLET, token: TOKEN, claims: [c1] };
    expect(resolveCallArg("{walletAddr}", ctx)).to.equal(WALLET);
    expect(resolveCallArg("{token}", ctx)).to.equal(TOKEN);
    expect(() => resolveCallArg("{token}", { walletAddr: WALLET, token: null, claims: [c1] })).to.throw(/native coin/);
  });

  it("resolves single-claim placeholders from the first claim", () => {
    let ctx = { walletAddr: WALLET, token: null, claims: [c1, c2] };
    expect(resolveCallArg("{target}", ctx)).to.equal(c1.target);
    expect(resolveCallArg("{amount}", ctx)).to.equal("100");
    expect(resolveCallArg("{sessionId}", ctx)).to.equal("sess-1");
    expect(resolveCallArg("{sessionHash}", ctx)).to.equal(keccak256(("0x" + Buffer.from("sess-1", "utf8").toString("hex")) as `0x${string}`));
    expect(resolveCallArg("{session.tokenAmount}", ctx)).to.equal("5");
    expect(resolveCallArg("{session.note}", ctx)).to.equal("a");
  });

  it("resolves list placeholders over all claims, in order", () => {
    let ctx = { walletAddr: WALLET, token: null, claims: [c1, c2] };
    expect(resolveCallArg("{targets[]}", ctx)).to.deep.equal([c1.target, c2.target]);
    expect(resolveCallArg("{amounts[]}", ctx)).to.deep.equal(["100", "250"]);
    expect(resolveCallArg("{sessionIds[]}", ctx)).to.deep.equal(["sess-1", "sess-2"]);
    expect((resolveCallArg("{sessionHashes[]}", ctx) as string[]).length).to.equal(2);
    expect(resolveCallArg("{session.tokenAmount[]}", ctx)).to.deep.equal(["5", "7"]);
    expect(resolveCallArg("{sum}", ctx)).to.equal("350");
    // singular spelling is accepted for the list form too
    expect(resolveCallArg("{amount[]}", ctx)).to.deep.equal(["100", "250"]);
  });

  it("uses the context amount when there are no claims (refill contract)", () => {
    let ctx = { walletAddr: WALLET, token: TOKEN, amount: "999" };
    expect(resolveCallArgs(["{walletAddr}", "{amount}", "{token}", "x"], ctx)).to.deep.equal([WALLET, "999", TOKEN, "x"]);
  });

  it("fails loudly on unknown placeholders and missing session data", () => {
    let ctx = { walletAddr: WALLET, token: null, claims: [c1, c2] };
    expect(() => resolveCallArg("{nope}", ctx)).to.throw(/unknown placeholder/);
    expect(() => resolveCallArg("{nope[]}", ctx)).to.throw(/unknown list placeholder/);
    expect(() => resolveCallArg("{session.note[]}", ctx)).to.throw(/sess-2 has no session data 'note'/);
    expect(() => resolveCallArg("{session.missing}", ctx)).to.throw(/sess-1 has no session data 'missing'/);
  });
});
