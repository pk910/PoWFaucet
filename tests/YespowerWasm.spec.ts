import 'mocha';
import { expect } from 'chai';

// upstream's tests.c hashes 80 bytes with src[i] = i * 3; the expected results are from its TESTS-OK
const KAT_INPUT = Buffer.from(Array.from({ length: 80 }, (_, i) => (i * 3) & 0xff)).toString("hex");
const KAT_VECTORS: { N: number, r: number, pers: string, hash: string }[] = [
  { N: 2048, r: 8,  pers: "", hash: "69e0e895b3df7aeeb837d71fe199e9d34f7ec46ecbca7a2c4308e51857ae9b46" },
  { N: 4096, r: 16, pers: "", hash: "33fb8f063824a4a020f63dca535f5ca66ab5576468c75d1ccaac7542f76495ac" },
  { N: 4096, r: 32, pers: "", hash: "771aeefda8fe79a0825bc7f2aee162ab5578574639ffc6ca3723cc18e5e3e285" },
  { N: 2048, r: 32, pers: "", hash: "d5efb813cd263e9b34540130233cbbc6a921fbff3431e5ec1a1abde2aea6ff4d" },
  { N: 1024, r: 32, pers: "", hash: "501b792db42e388f6e7d453c95d03a12a36016a5154a688390ddc609a40c6799" },
  { N: 1024, r: 32, pers: "personality test", hash: "1f0269acf565c49adc0ef9b8f26ab3808cdc38394a254fddeedcc3aacff6ad9d" },
];

describe("yespower wasm", () => {
  let yespowerLib: any;

  before(async () => {
    yespowerLib = (await import("../libs/yespower_wasm.cjs")).default;
    await yespowerLib.getYespowerReadyPromise();
  });

  it("selects the SIMD build where the engine supports it", () => {
    expect(yespowerLib.getYespowerVariant()).to.equal("simd", "node supports wasm SIMD");
    expect(typeof yespowerLib.getYespower()).to.equal("function", "no hash function after ready");
  });

  for(let variant of ["simd", "baseline"]) {
    it("reproduces the upstream test vectors (" + variant + ")", async () => {
      let yespower = await yespowerLib.loadYespowerVariant(variant);
      for(let vector of KAT_VECTORS) {
        expect(yespower(KAT_INPUT, vector.N, vector.r, vector.pers)).to.equal(vector.hash, "N=" + vector.N + " r=" + vector.r + " pers=" + JSON.stringify(vector.pers));
      }
    });
  }

  it("reports rejected input and params as '!' results", () => {
    let yespower = yespowerLib.getYespower();
    expect(yespower(KAT_INPUT, 1000, 8, "")).to.equal("!invalid params", "N not a power of 2");
    expect(yespower(KAT_INPUT, 2048, 7, "")).to.equal("!invalid params", "r too small");
    expect(yespower(KAT_INPUT, 2048, 33, "")).to.equal("!invalid params", "r too large");
    expect(yespower("", 2048, 8, "")).to.equal("!input is not hex", "empty input");
    expect(yespower("abc", 2048, 8, "")).to.equal("!input is not hex", "odd hex length");
    expect(yespower("0g", 2048, 8, "")).to.equal("!input is not hex", "non-hex character");
    expect(yespower("00".repeat(129), 2048, 8, "")).to.equal("!input too long", "input over 128 bytes");
    expect(yespower(KAT_INPUT, 2048, 8, "x".repeat(65))).to.equal("!pers too long", "pers over 64 bytes");
  });

  it("accepts input and pers at their size limits", () => {
    let yespower = yespowerLib.getYespower();
    expect(yespower("00".repeat(128), 1024, 8, "x".repeat(64))).to.match(/^[0-9a-f]{64}$/, "128 byte input, 64 byte pers");
  });

  it("rejects an unknown variant", async () => {
    let error: any = null;
    await yespowerLib.loadYespowerVariant("avx512").catch((err: any) => { error = err; });
    expect(error && error.message).to.match(/unknown yespower variant/, "unknown variant must reject");
  });
});
