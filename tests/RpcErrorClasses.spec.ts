import 'mocha';
import { expect } from 'chai';
import { HttpRequestError, RpcRequestError, TimeoutError, UnknownRpcError } from 'viem';
import { isDefiniteRejection, isTransientRejection, isTransportError, isTxAlreadyKnownError } from '../src/eth/rpc/index.js';

/**
 * What the faucet makes of an error from the node: a lost request (the transaction may be out)
 * against a definite answer (it is not). viem wraps JSON-RPC errors with codes it does not know in
 * UnknownRpcError, the same class it uses around failed requests; the cause tells them apart.
 */
describe("RPC error classification", () => {
  const url = "http://node.example/";
  const rpcError = (code: number, message: string) => new RpcRequestError({ body: { method: "eth_sendRawTransaction" }, error: { code, message }, url });

  it("takes a failed request for a transport error", () => {
    expect(isTransportError(new HttpRequestError({ url, details: "fetch failed" }))).to.equal(true);
    expect(isTransportError(new TimeoutError({ body: {}, url }))).to.equal(true);
    expect(isTransportError(new UnknownRpcError(new HttpRequestError({ url, details: "socket hang up" })))).to.equal(true, "a failed request viem wrapped");
    expect(isTransportError({ name: "FetchError", message: "request to " + url + " failed, reason: connect ECONNREFUSED" })).to.equal(true);
  });

  it("takes a JSON-RPC error for a definite answer, whatever its code", () => {
    expect(isTransportError(rpcError(-32000, "insufficient funds for gas * price + value"))).to.equal(false);
    expect(isTransportError(new UnknownRpcError(rpcError(-32010, "tx fee exceeds the configured cap")))).to.equal(false, "a node's own rejection code is still a rejection");
    expect(isTransportError(new UnknownRpcError(rpcError(3, "execution reverted")))).to.equal(false);
  });

  it("knows the refusals that are about the moment, not the transaction", () => {
    expect(isTransientRejection(rpcError(-32000, "txpool is full"))).to.equal(true);
    expect(isTransientRejection(rpcError(-32000, "in-flight transaction limit reached for delegated accounts"))).to.equal(true);
    expect(isTransientRejection(rpcError(-32005, "too many requests, rate limit exceeded"))).to.equal(true);
    expect(isTransientRejection(rpcError(-32000, "tx fee (3.29 ether) exceeds the configured cap (1.00 ether)"))).to.equal(false, "the same bytes would be refused again");
    expect(isTransientRejection(rpcError(-32000, "insufficient funds for gas * price + value"))).to.equal(false);
  });

  it("knows the validation errors after which the bytes are nowhere, and takes nothing else for one", () => {
    expect(isDefiniteRejection(rpcError(-32000, "insufficient funds for gas * price + value"))).to.equal(true);
    expect(isDefiniteRejection(rpcError(-32000, "intrinsic gas too low"))).to.equal(true);
    expect(isDefiniteRejection(rpcError(-32000, "exceeds block gas limit"))).to.equal(true);
    expect(isDefiniteRejection(rpcError(-32602, "tx fee (3.29 ether) exceeds the configured cap (1.00 ether)"))).to.equal(true);
    expect(isDefiniteRejection(rpcError(-32000, "invalid sender"))).to.equal(true);
    expect(isDefiniteRejection(rpcError(-32603, "internal error"))).to.equal(false, "an internal error says nothing about the bytes");
    expect(isDefiniteRejection(rpcError(-32000, "txpool is full"))).to.equal(false);
    expect(isDefiniteRejection(rpcError(-32000, "test error 57572x"))).to.equal(false);
  });

  it("knows the answers that mean the node has the transaction already", () => {
    expect(isTxAlreadyKnownError(rpcError(-32000, "already known"))).to.equal(true);
    expect(isTxAlreadyKnownError(rpcError(-32000, "nonce too low"))).to.equal(true);
    expect(isTxAlreadyKnownError(rpcError(-32000, "insufficient funds"))).to.equal(false);
  });
});
