import 'mocha';
import { expect } from 'chai';
import { ContractCaller, IEthRpcClient } from '../src/eth/rpc/index.js';

describe("ContractCaller", () => {
  const WALLET = "0xca9456991e0aa5d5321e88bba44d405aab401193";
  const CONTRACT = "0xA5058fbcD09425e922E3E9e78D569aB84EdB88Eb";
  const ABI = [
    "function getClaimableBalance() view returns (uint256)",
    "function getAllowance(address addr) view returns (uint256)",
  ];
  const ONE_THOUSAND_ETH = "0x00000000000000000000000000000000000000000000003635c9adc5dea00000";

  function clientRecording(calls: { to: string; data: string; from: string | undefined }[]): IEthRpcClient {
    return {
      call: async (to: string, data: string, from?: string) => {
        calls.push({ to, data, from });
        return ONE_THOUSAND_ETH;
      },
    } as unknown as IEthRpcClient;
  }

  it("sends its calls as the given sender", async () => {
    let calls = [];
    let caller = new ContractCaller(clientRecording(calls), CONTRACT, ABI, WALLET);
    let allowance = await caller.call("getClaimableBalance");
    expect(allowance).to.equal(1000000000000000000000n, "unexpected decoded result");
    expect(calls.length).to.equal(1, "unexpected number of calls");
    expect(calls[0].to).to.equal(CONTRACT, "unexpected call target");
    expect(calls[0].data).to.equal("0xe0bd3015", "unexpected call data");
    expect(calls[0].from).to.equal(WALLET, "the call is not sent as the given sender");
  });

  it("sends its calls without a sender when none is given", async () => {
    let calls = [];
    let caller = new ContractCaller(clientRecording(calls), CONTRACT, ABI);
    await caller.call("getAllowance", [WALLET]);
    expect(calls.length).to.equal(1, "unexpected number of calls");
    expect(calls[0].data).to.equal("0xeb5a662e000000000000000000000000ca9456991e0aa5d5321e88bba44d405aab401193", "unexpected call data");
    expect(calls[0].from).to.equal(undefined, "unexpected sender");
  });
});
