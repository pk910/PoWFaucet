import { IClaimCall } from '../../config/ConfigSchema.js';
import { ContractCaller } from '../rpc/index.js';
import { CallArgContext, resolveCallArg, resolveCallArgs } from '../CallArgs.js';
import { EthClaimInfo } from '../EthClaimManager.js';

/**
 * A claim's calls, resolved for one claim, and their packed form for the batcher
 * (contracts/PoWFaucetBatcher.sol, executed by the faucet wallet on itself):
 *   0x00 transfer  to(20) amount(12)
 *   0x01 token     token(20) to(20) amount(12)
 *   0x02 call      to(20) value(12) gas(4) len(2) data
 * Amounts are uint96 (enough for 79 billion ether), gas uint32, lengths uint16.
 */
export const CLAIM_CALL_KINDS = { transfer: 0, token: 1, call: 2 } as const;

/** gas a `call` may use when the template does not say */
export const DEFAULT_CALL_GAS = 200000;

/** the batcher's stipend for a transfer (TRANSFER_GAS in the contract); a token transfer gets twice that */
export const BATCHER_TRANSFER_GAS = 50000;

const UINT96_MAX = (1n << 96n) - 1n;

/** One call with its placeholders filled in. */
export interface ResolvedClaimCall {
  type: IClaimCall["type"];
  /** recipient (transfer, token) or callee (call), lower-cased */
  to: string;
  /** the token contract (token calls), lower-cased */
  token?: string;
  /** wei or token base units (transfer, token), or the native coin sent along (call) */
  amount: bigint;
  /** gas the call may use (call) */
  gas?: number;
  /** calldata without 0x (call), empty otherwise */
  data: string;
}

export interface EncodedBatchCalls {
  /** the stream, 0x-prefixed */
  calls: string;
  /** every sub-call in stream order, as resolved */
  resolved: ResolvedClaimCall[];
  /** native coin the stream moves out of the wallet, in wei */
  value: bigint;
  /** calls per claim: the position of a failed sub-call divided by this is the claim's position */
  callsPerClaim: number;
}

function address(value: unknown, what: string): string {
  // "0X..." is accepted as before (the old transfer path normalized the prefix)
  if(typeof value !== "string" || !/^0[xX][0-9a-fA-F]{40}$/.test(value))
    throw new Error("claim call " + what + " is not an address: " + String(value));
  return value.toLowerCase();
}

function uint(value: unknown, what: string): bigint {
  try {
    return BigInt(value as string);
  } catch(ex) {
    throw new Error("claim call " + what + " is not a number: " + String(value));
  }
}

function calldata(value: unknown): string {
  if(value === undefined || value === null || value === "")
    return "";
  if(typeof value !== "string" || !/^0x([0-9a-fA-F]{2})*$/.test(value))
    throw new Error("claim call data is not hex: " + String(value));
  return value.substring(2).toLowerCase();
}

/**
 * A call into the wallet itself would run the batcher's code with a stream of its own, past the
 * self-only gate and past the faucet's accounting. The contract refuses it; so does this, earlier.
 */
function notTheWallet(addr: string, ctx: CallArgContext, what: string): void {
  if(ctx.walletAddr && addr === ctx.walletAddr.toLowerCase())
    throw new Error("claim call " + what + " is the faucet wallet itself");
}

/** The call with its placeholders resolved against `ctx` (one claim). */
export function resolveClaimCall(template: IClaimCall, ctx: CallArgContext): ResolvedClaimCall {
  if(CLAIM_CALL_KINDS[template.type] === undefined)
    throw new Error("unknown claim call type '" + template.type + "' (transfer, token or call)");
  let resolve = (field: string | undefined) => field === undefined ? undefined : resolveCallArg(field, ctx);
  switch(template.type) {
    case "transfer":
      return { type: "transfer", to: address(resolve(template.to), "to"), amount: uint(resolve(template.amount), "amount"), data: "" };
    case "token": {
      let token = address(resolve(template.token), "token");
      notTheWallet(token, ctx, "token");
      return { type: "token", token, to: address(resolve(template.to), "to"), amount: uint(resolve(template.amount), "amount"), data: "" };
    }
    case "call": {
      let data: string;
      if(template.abi && template.fn)
        data = ContractCaller.encodeCall(template.abi, template.fn, resolveCallArgs(template.args || [], ctx)).substring(2);
      else
        data = calldata(resolve(template.data));
      let to = address(resolve(template.to), "to");
      notTheWallet(to, ctx, "to");
      let gas = typeof template.gas === "number" && template.gas > 0 ? Math.floor(template.gas) : DEFAULT_CALL_GAS;
      return { type: "call", to, amount: uint(resolve(template.value) ?? "0", "value"), gas, data };
    }
  }
}

function packedUint(num: bigint, bytes: number, what: string): string {
  let max = (1n << BigInt(bytes * 8)) - 1n;
  if(num < 0n || num > max)
    throw new Error("claim call " + what + " out of range for the batch stream: " + num.toString());
  return num.toString(16).padStart(bytes * 2, "0");
}

/** One resolved call in the stream's wire format (without 0x). */
export function packClaimCall(call: ResolvedClaimCall): string {
  switch(call.type) {
    case "transfer":
      return "00" + call.to.substring(2) + packedUint(call.amount, 12, "amount");
    case "token":
      return "01" + call.token.substring(2) + call.to.substring(2) + packedUint(call.amount, 12, "amount");
    case "call":
      return "02" + call.to.substring(2) + packedUint(call.amount, 12, "value") + packedUint(BigInt(call.gas ?? DEFAULT_CALL_GAS), 4, "gas") + packedUint(BigInt(call.data.length / 2), 2, "data length") + call.data;
  }
}

/** The stream for these claims: every claim contributes its calls, in claim order. */
export function encodeBatchCalls(templates: IClaimCall[], claims: EthClaimInfo[], ctx: Omit<CallArgContext, "claims">): EncodedBatchCalls {
  if(!templates || templates.length === 0)
    throw new Error("ethClaimTx.calls is empty");
  let hex = "";
  let value = 0n;
  let resolved: ResolvedClaimCall[] = [];
  for(let claim of claims) {
    for(let template of templates) {
      let call = resolveClaimCall(template, { ...ctx, claims: [claim] });
      resolved.push(call);
      hex += packClaimCall(call);
      if(call.type !== "token")
        value += call.amount;
    }
  }
  return { calls: "0x" + hex, value, resolved, callsPerClaim: templates.length };
}
